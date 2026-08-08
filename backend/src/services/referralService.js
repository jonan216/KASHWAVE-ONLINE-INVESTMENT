const { pool, mockStore, isPostgresConnected } = require('../config/db');
const WalletModel = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');
const env = require('../config/env');

async function creditReferralBonus(referrerId, refereeId) {
  const bonusAmount = env.REFERRAL_BONUS_AMOUNT || 200;
  if (!bonusAmount || bonusAmount <= 0) return null;

  try {
    if (isPostgresConnected()) {
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
        [referenceCode, referrerId, bonusAmount, 'Referral Bonus', `Referral bonus for inviting user ${refereeId}`]
      );

      return { wallet, bonusAmount, referenceCode };
    } else {
      const referrer = mockStore.users.find(u => u.id === parseInt(referrerId));
      if (!referrer) return null;

      const wallet = WalletModel.updateBalance(referrerId, {
        mainDelta: bonusAmount,
        depositedDelta: bonusAmount
      });

      const referenceCode = `KW-REF-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      if (!mockStore.transactions) mockStore.transactions = [];
      mockStore.transactions.push({
        id: Date.now(),
        reference_code: referenceCode,
        user_id: referrerId,
        type: 'referral_bonus',
        amount: bonusAmount,
        currency: 'UGX',
        status: 'completed',
        payment_method: 'Referral Bonus',
        admin_notes: `Referral bonus for inviting user ${refereeId}`,
        created_at: new Date().toISOString()
      });

      return { wallet, bonusAmount, referenceCode };
    }
  } catch (err) {
    console.error('[REFERRAL] Error crediting referral bonus:', err.message);
    return null;
  }
}

module.exports = { creditReferralBonus };
