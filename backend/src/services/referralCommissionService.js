const { pool, mockStore, isPostgresConnected } = require('../config/db');
const WalletModel = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');
const env = require('../config/env');

async function getReferralChain(userId) {
  if (!isPostgresConnected() || !pool) return [];
  
  const chain = [];
  let currentUserId = userId;
  
  for (let level = 1; level <= 3; level++) {
    const result = await pool.query(
      `SELECT r.referrer_id, u.email, u.full_name 
       FROM referrals r 
       JOIN users u ON r.referrer_id = u.id 
       WHERE r.referee_id = $1 LIMIT 1`,
      [currentUserId]
    );
    
    if (result.rows.length === 0) break;
    
    chain.push({
      level,
      referrer_id: result.rows[0].referrer_id,
      email: result.rows[0].email,
      full_name: result.rows[0].full_name
    });
    
    currentUserId = result.rows[0].referrer_id;
  }
  
  return chain;
}

async function creditReferralCommissions(depositorId, depositAmount) {
  const commissionRates = {
    1: env.REFERRAL_L1 || 4,
    2: env.REFERRAL_L2 || 3,
    3: env.REFERRAL_L3 || 2
  };

  try {
    const chain = await getReferralChain(depositorId);
    if (chain.length === 0) return [];

    const results = [];
    
    for (const ref of chain) {
      const rate = commissionRates[ref.level] || 0;
      if (rate <= 0) continue;
      
      const commissionAmount = parseFloat((depositAmount * rate / 100).toFixed(2));
      if (commissionAmount <= 0) continue;

      try {
        const wallet = await WalletModel.updateBalance(ref.referrer_id, {
          mainDelta: commissionAmount,
          depositedDelta: commissionAmount
        });

        const referenceCode = `KW-REF-COM-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
        
        if (isPostgresConnected() && pool) {
          await pool.query(
            `INSERT INTO transactions (reference_code, user_id, type, amount, currency, status, payment_method, admin_notes)
             VALUES ($1, $2, 'referral_commission', $3, 'UGX', 'completed', $4, $5)`,
            [
              referenceCode,
              ref.referrer_id,
              commissionAmount,
              `Referral Commission L${ref.level}`,
              `Level ${ref.level} commission from deposit by user ${depositorId} (${rate}% of UGX ${depositAmount})`
            ]
          );
        } else {
          if (!mockStore.transactions) mockStore.transactions = [];
          mockStore.transactions.push({
            id: Date.now(),
            reference_code: referenceCode,
            user_id: ref.referrer_id,
            type: 'referral_commission',
            amount: commissionAmount,
            currency: 'UGX',
            status: 'completed',
            payment_method: `Referral Commission L${ref.level}`,
            admin_notes: `Level ${ref.level} commission from deposit by user ${depositorId} (${rate}% of UGX ${depositAmount})`,
            created_at: new Date().toISOString()
          });
        }

        results.push({
          level: ref.level,
          referrer_id: ref.referrer_id,
          amount: commissionAmount,
          rate: rate,
          reference: referenceCode
        });

        if (isPostgresConnected() && pool) {
          await pool.query(
            `UPDATE referrals SET earned_amount = COALESCE(earned_amount, 0) + $1 WHERE referrer_id = $2 AND referee_id = $3`,
            [commissionAmount, ref.referrer_id, depositorId]
          );
        }
      } catch (commissionErr) {
        console.error(`[REFERRAL] Failed to credit Level ${ref.level} commission:`, commissionErr.message);
      }
    }

    return results;
  } catch (err) {
    console.error('[REFERRAL] Error processing referral commissions:', err.message);
    return [];
  }
}

module.exports = { creditReferralCommissions, getReferralChain };
