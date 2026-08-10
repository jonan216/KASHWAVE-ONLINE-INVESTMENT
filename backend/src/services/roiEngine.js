/**
 * KashWave 24-Hour Automated ROI Engine
 * Calculates investor returns every 24 hours from creation date / last payout date.
 * Credits profits directly into main_balance (Available Balance).
 */

const { pool, mockStore, isPostgresConnected } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

/**
 * Fetch active ROI setting or plan daily return percent for an investment plan
 */
const getActiveROISetting = async (planId) => {
  if (isPostgresConnected() && pool) {
    try {
      const result = await pool.query(
        `SELECT * FROM roi_settings
         WHERE investment_plan_id = $1 AND active_status = TRUE
         ORDER BY created_at DESC LIMIT 1`,
        [planId]
      );
      if (result.rows[0]) return result.rows[0];
    } catch (_) {}

    try {
      const planRes = await pool.query(
        `SELECT daily_return_percent as profit_percentage, duration_days as duration, 'daily' as calculation_type
         FROM investment_plans WHERE id = $1`,
        [planId]
      );
      if (planRes.rows[0]) return planRes.rows[0];
    } catch (_) {}
  }

  const plan = (mockStore.plans || []).find(p => p.id === parseInt(planId));
  return {
    profit_percentage: plan?.daily_return_percent || 5.0,
    calculation_type: 'daily',
    duration: plan?.duration_days || 60
  };
};

/**
 * Calculate expected return for an investment amount + ROI setting
 */
const calculateExpectedReturn = (amount, roiSetting) => {
  const rate = parseFloat(roiSetting.profit_percentage || 5.0) / 100;
  const duration = parseInt(roiSetting.duration || 60);
  return parseFloat((amount * (1 + rate * duration)).toFixed(2));
};

/**
 * Calculate daily ROI amount for a single investment
 */
const calculateDailyROI = (investment, roiSetting) => {
  const rate = parseFloat(roiSetting.profit_percentage || 5.0) / 100;
  const amount = parseFloat(investment.invested_amount);
  return parseFloat((amount * rate).toFixed(2));
};

/**
 * Main 24-Hour ROI Distribution Engine
 * Evaluates active investments and awards 24-hour profits directly to main_balance (Available Balance).
 */
const processROIPayouts = async () => {
  let processedCount = 0;
  let totalDistributed = 0;

  try {
    if (isPostgresConnected() && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Fetch all active investments where 24 hours have passed since last_payout_at or created_at
        const activeInvestments = await client.query(`
          SELECT i.*, ip.daily_return_percent as plan_daily_rate, ip.id as plan_id
          FROM investments i
          JOIN investment_plans ip ON i.plan_id = ip.id
          WHERE i.status = 'active'
            AND (i.end_date IS NULL OR i.end_date > NOW())
            AND (
              (i.last_payout_at IS NULL AND i.created_at <= NOW() - INTERVAL '24 hours')
              OR (i.last_payout_at IS NOT NULL AND i.last_payout_at <= NOW() - INTERVAL '24 hours')
            )
        `);

        for (const investment of activeInvestments.rows) {
          const roiSetting = await getActiveROISetting(investment.plan_id);
          const profitPercent = roiSetting?.profit_percentage || investment.plan_daily_rate || 5.0;
          const dailyRate = parseFloat(profitPercent) / 100;
          const investedAmount = parseFloat(investment.invested_amount);

          const baseTime = new Date(investment.last_payout_at || investment.created_at).getTime();
          const nowTime = Date.now();
          const hoursElapsed = (nowTime - baseTime) / (1000 * 60 * 60);
          const intervalsToPay = Math.floor(hoursElapsed / 24);

          if (intervalsToPay < 1) continue;

          const todayRoi = parseFloat((investedAmount * dailyRate * intervalsToPay).toFixed(2));
          if (todayRoi <= 0) continue;

          // 1. Update investment (accrued_earnings & last_payout_at timestamp)
          await client.query(
            `UPDATE investments 
             SET accrued_earnings = accrued_earnings + $1, 
                 last_payout_at = NOW()
             WHERE id = $2`,
            [todayRoi, investment.id]
          );

          // 2. Credit investor wallet: main_balance (AVAILABLE BALANCE) and total_earnings
          await client.query(
            `UPDATE wallets 
             SET main_balance = main_balance + $1, 
                 total_earnings = total_earnings + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2`,
            [todayRoi, investment.user_id]
          );

          // 3. Log transaction
          const refCode = `KW-ROI-${Date.now()}-${investment.id}`;
          await client.query(
            `INSERT INTO transactions (reference_code, user_id, type, amount, currency, status, payment_method, admin_notes)
             VALUES ($1,$2,'roi_payout',$3,'UGX','completed','ROI Engine','24-Hour Profit Return Payout')`,
            [refCode, investment.user_id, todayRoi]
          );

          processedCount++;
          totalDistributed += todayRoi;
        }

        // Auto-mature investments that hit end_date
        await client.query(`
          UPDATE investments SET status = 'completed', capital_locked = FALSE
          WHERE status = 'active' AND end_date <= NOW()
        `);

        await client.query('COMMIT');
        if (processedCount > 0) {
          console.log(`[ROI ENGINE] SUCCESS: Credited ${processedCount} investment(s) with total UGX ${totalDistributed.toLocaleString()} to Available Balance`);
        }

        return { processedCount, totalDistributed };
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ROI ENGINE ROLLBACK]', err.message);
        throw err;
      } finally {
        client.release();
      }
    } else {
      // Mock store simulation
      const now = Date.now();
      for (const inv of (mockStore.investments || [])) {
        if (inv.status !== 'active') continue;
        const baseTime = new Date(inv.last_payout_at || inv.created_at || now).getTime();
        const hoursElapsed = (now - baseTime) / (1000 * 60 * 60);
        if (hoursElapsed >= 24) {
          const intervalsToPay = Math.floor(hoursElapsed / 24);
          const rate = 0.05;
          const todayRoi = parseFloat((parseFloat(inv.invested_amount) * rate * intervalsToPay).toFixed(2));
          inv.accrued_earnings = (parseFloat(inv.accrued_earnings) || 0) + todayRoi;
          inv.last_payout_at = new Date().toISOString();

          const wallet = (mockStore.wallets || []).find(w => w.user_id === inv.user_id);
          if (wallet) {
            wallet.main_balance = parseFloat(((parseFloat(wallet.main_balance) || 0) + todayRoi).toFixed(2));
            wallet.total_earnings = parseFloat(((parseFloat(wallet.total_earnings) || 0) + todayRoi).toFixed(2));
          }
          processedCount++;
          totalDistributed += todayRoi;
        }
      }
      return { processedCount, totalDistributed };
    }
  } catch (err) {
    console.error('[ROI ENGINE ERROR]', err.message);
    return { processedCount: 0, totalDistributed: 0, error: err.message };
  }
};

module.exports = {
  getActiveROISetting,
  calculateExpectedReturn,
  calculateDailyROI,
  processROIPayouts
};
