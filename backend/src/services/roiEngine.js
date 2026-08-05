/**
 * KashWave ROI Engine
 * Dynamically calculates investor returns based on admin-configured roi_settings.
 * Supports: daily, weekly, monthly, and fixed_maturity calculation types.
 *
 * This engine runs as a scheduled job (CRON) or can be triggered manually by admin.
 */

const { pool, mockStore, isPostgresConnected } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

/**
 * Fetch the active ROI setting for a given investment plan
 */
const getActiveROISetting = async (planId) => {
  if (isPostgresConnected() && pool) {
    const result = await pool.query(
      `SELECT * FROM roi_settings
       WHERE investment_plan_id = $1 AND active_status = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [planId]
    );
    return result.rows[0] || null;
  }
  // Mock fallback
  const settings = (mockStore.roi_settings || []);
  return settings.find(s => s.investment_plan_id === planId && s.active_status) || {
    profit_percentage: 5.0,
    calculation_type: 'daily',
    duration: 60
  };
};

/**
 * Calculate expected return for a given investment amount + ROI setting
 */
const calculateExpectedReturn = (amount, roiSetting) => {
  const rate = parseFloat(roiSetting.profit_percentage) / 100;
  const duration = parseInt(roiSetting.duration);

  switch (roiSetting.calculation_type) {
    case 'daily':
      return parseFloat((amount * rate * duration).toFixed(2));
    case 'weekly':
      return parseFloat((amount * rate * Math.ceil(duration / 7)).toFixed(2));
    case 'monthly':
      return parseFloat((amount * rate * Math.ceil(duration / 30)).toFixed(2));
    case 'fixed_maturity':
      return parseFloat((amount * rate).toFixed(2));
    default:
      return parseFloat((amount * rate * duration).toFixed(2));
  }
};

/**
 * Calculate daily ROI amount for a single investment
 */
const calculateDailyROI = (investment, roiSetting) => {
  const rate = parseFloat(roiSetting.profit_percentage) / 100;
  const amount = parseFloat(investment.invested_amount);

  switch (roiSetting.calculation_type) {
    case 'daily':
      return parseFloat((amount * rate).toFixed(2));
    case 'weekly':
      return parseFloat(((amount * rate * 52) / 365).toFixed(2));
    case 'monthly':
      return parseFloat(((amount * rate * 12) / 365).toFixed(2));
    case 'fixed_maturity':
      return 0; // Pays at end only
    default:
      return parseFloat((amount * rate).toFixed(2));
  }
};

/**
 * Main ROI Distribution Engine
 * Called by CRON job OR triggered manually from admin panel.
 * Processes all active investments that haven't been paid out today.
 */
const processROIPayouts = async () => {
  console.log('[ROI ENGINE] Starting ROI distribution run...');
  let processedCount = 0;
  let totalDistributed = 0;

  try {
    if (isPostgresConnected() && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Fetch all active, non-matured investments due for payout
        const activeInvestments = await client.query(`
          SELECT i.*, ip.id as plan_id
          FROM investments i
          JOIN investment_plans ip ON i.plan_id = ip.id
          WHERE i.status = 'active'
            AND i.end_date > NOW()
            AND DATE(i.last_payout_at) < CURRENT_DATE
            AND EXTRACT(DOW FROM NOW()) BETWEEN 1 AND 5
        `);

        for (const investment of activeInvestments.rows) {
          const roiSetting = await getActiveROISetting(investment.plan_id);
          if (!roiSetting) continue;

          const todayRoi = calculateDailyROI(investment, roiSetting);
          if (todayRoi <= 0) continue;

          // 1. Update investment accrued earnings
          await client.query(
            `UPDATE investments SET accrued_earnings = accrued_earnings + $1, last_payout_at = NOW()
             WHERE id = $2`,
            [todayRoi, investment.id]
          );

          // 2. Credit investor wallet (main balance)
          await client.query(
            `UPDATE wallets SET main_balance = main_balance + $1, total_earnings = total_earnings + $1
             WHERE user_id = $2`,
            [todayRoi, investment.user_id]
          );

          // 3. Record transaction
          const refCode = `KW-ROI-${Date.now()}-${investment.id}`;
          await client.query(
            `INSERT INTO transactions (reference_code, user_id, type, amount, currency, status, payment_method)
             VALUES ($1,$2,'roi_payout',$3,'UGX','completed','ROI Engine')`,
            [refCode, investment.user_id, todayRoi]
          );

          processedCount++;
          totalDistributed += todayRoi;
        }

        // Check and mature investments that have passed end_date
        await client.query(`
          UPDATE investments SET status = 'completed', capital_locked = FALSE
          WHERE status = 'active' AND end_date <= NOW()
        `);

        await client.query('COMMIT');
        console.log(`[ROI ENGINE] SUCCESS: Paid ${processedCount} investments | Total: UGX ${totalDistributed.toLocaleString()}`);

        await writeAuditLog({
          action: 'roi_payout_run',
          description: `ROI engine distributed UGX ${totalDistributed} to ${processedCount} active investments`,
          severity: 'info'
        });

        return { processedCount, totalDistributed };
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ROI ENGINE] ROLLBACK due to error:', err.message);
        throw err;
      } finally {
        client.release();
      }
    } else {
      // Mock store payout simulation
      const today = new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('[ROI ENGINE] Weekend — no payouts today.');
        return { processedCount: 0, totalDistributed: 0 };
      }

      for (const inv of (mockStore.investments || [])) {
        if (inv.status !== 'active') continue;
        const roiSetting = await getActiveROISetting(inv.plan_id);
        const todayRoi = calculateDailyROI(inv, roiSetting);
        inv.accrued_earnings = (parseFloat(inv.accrued_earnings) || 0) + todayRoi;

        const wallet = mockStore.wallets.find(w => w.user_id === inv.user_id);
        if (wallet) {
          wallet.main_balance = (parseFloat(wallet.main_balance) || 0) + todayRoi;
          wallet.total_earnings = (parseFloat(wallet.total_earnings) || 0) + todayRoi;
        }
        processedCount++;
        totalDistributed += todayRoi;
      }
      return { processedCount, totalDistributed };
    }
  } catch (err) {
    console.error('[ROI ENGINE] Fatal error:', err.message);
    throw err;
  }
};

module.exports = {
  getActiveROISetting,
  calculateExpectedReturn,
  calculateDailyROI,
  processROIPayouts
};
