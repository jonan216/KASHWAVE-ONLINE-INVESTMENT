const { pool, mockStore, isPostgresConnected } = require('../config/db');
const WalletModel = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');
const env = require('../config/env');

const { creditReferralCommissions } = require('./referralCommissionService');

async function creditReferralBonus(referrerId, refereeId) {
  const bonusAmount = env.REFERRAL_BONUS_AMOUNT || 500;
  if (!bonusAmount || bonusAmount <= 0) return null;

  try {
    if (isPostgresConnected() && pool) {
      // Prevent double crediting for the same referee
      const existingBonus = await pool.query(
        `SELECT id FROM transactions WHERE user_id = $1 AND type = 'referral_bonus' AND admin_notes LIKE $2 LIMIT 1`,
        [referrerId, `%user ${refereeId}%`]
      );
      if (existingBonus.rows.length > 0) return null;

      const referrer = await pool.query('SELECT * FROM users WHERE id = $1', [referrerId]);
      if (!referrer.rows[0]) return null;

      const wallet = await WalletModel.updateBalance(referrerId, {
        mainDelta: bonusAmount,
        depositedDelta: bonusAmount
      });

      const referenceCode = `KW-REF-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      await pool.query(
        `INSERT INTO transactions (reference_code, user_id, type, amount, currency, status, payment_method, admin_notes)
         VALUES ($1, $2, 'referral_bonus', $3, 'UGX', 'completed', $4, $5)`,
        [referenceCode, referrerId, bonusAmount, 'Referral Bonus', `Referral bonus for deposit by user ${refereeId}`]
      );

      await pool.query(
        `UPDATE referrals SET earned_amount = COALESCE(earned_amount, 0) + $1 WHERE referrer_id = $2 AND referee_id = $3`,
        [bonusAmount, referrerId, refereeId]
      );

      return { wallet, bonusAmount, referenceCode };
    } else {
      if (!mockStore.transactions) mockStore.transactions = [];
      const existingBonus = mockStore.transactions.find(
        t => t.user_id === referrerId && t.type === 'referral_bonus' && (t.admin_notes || '').includes(`user ${refereeId}`)
      );
      if (existingBonus) return null;

      const referrer = (mockStore.users || []).find(u => u.id === parseInt(referrerId));
      if (!referrer) return null;

      const wallet = WalletModel.updateBalance(referrerId, {
        mainDelta: bonusAmount,
        depositedDelta: bonusAmount
      });

      const referenceCode = `KW-REF-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      mockStore.transactions.push({
        id: Date.now(),
        reference_code: referenceCode,
        user_id: referrerId,
        type: 'referral_bonus',
        amount: bonusAmount,
        currency: 'UGX',
        status: 'completed',
        payment_method: 'Referral Bonus',
        admin_notes: `Referral bonus for deposit by user ${refereeId}`,
        created_at: new Date().toISOString()
      });

      const ref = (mockStore.referrals || []).find(r => r.referrer_id === parseInt(referrerId) && r.referee_id === parseInt(refereeId));
      if (ref) ref.earned_amount = (ref.earned_amount || 0) + bonusAmount;

      return { wallet, bonusAmount, referenceCode };
    }
  } catch (err) {
    console.error('[REFERRAL] Error crediting referral bonus:', err.message);
    return null;
  }
}

async function processReferralPayoutsOnDeposit(depositorUserId, depositAmount) {
  try {
    const amount = parseFloat(depositAmount || 0);
    if (amount <= 0) return { commissions: [], referralBonus: null };

    // 1. Credit 3-level referral commissions (Level 1: 4%, Level 2: 3%, Level 3: 2%)
    const commissions = await creditReferralCommissions(depositorUserId, amount);

    // 2. Find direct referrer to award first-deposit referral bonus
    let referralBonus = null;
    let referrerId = null;

    if (isPostgresConnected() && pool) {
      const userRes = await pool.query(`SELECT id, referred_by_code FROM users WHERE id = $1`, [depositorUserId]);
      const user = userRes.rows[0];

      if (user && user.referred_by_code) {
        const refRes = await pool.query(`SELECT id FROM users WHERE referral_code = $1`, [user.referred_by_code]);
        if (refRes.rows[0]) referrerId = refRes.rows[0].id;
      }
      if (!referrerId) {
        const refLink = await pool.query(`SELECT referrer_id FROM referrals WHERE referee_id = $1 LIMIT 1`, [depositorUserId]);
        if (refLink.rows[0]) referrerId = refLink.rows[0].referrer_id;
      }
    } else {
      const user = (mockStore.users || []).find(u => u.id === parseInt(depositorUserId));
      if (user && user.referred_by_code) {
        const refUser = (mockStore.users || []).find(u => u.referral_code === user.referred_by_code);
        if (refUser) referrerId = refUser.id;
      }
      if (!referrerId) {
        const refLink = (mockStore.referrals || []).find(r => r.referee_id === parseInt(depositorUserId));
        if (refLink) referrerId = refLink.referrer_id;
      }
    }

    if (referrerId && parseInt(referrerId) !== parseInt(depositorUserId)) {
      referralBonus = await creditReferralBonus(referrerId, depositorUserId);
    }

    return { commissions, referralBonus };
  } catch (err) {
    console.error('[REFERRAL] processReferralPayoutsOnDeposit error:', err.message);
    return { commissions: [], referralBonus: null };
  }
}

module.exports = { creditReferralBonus, processReferralPayoutsOnDeposit };
