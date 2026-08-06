const { pool, mockStore, isPostgresConnected } = require('../config/db');

class WalletModel {
  static async getByUserId(userId) {
    if (isPostgresConnected()) {
      const res = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
      return res.rows[0] || null;
    } else {
      return mockStore.wallets.find(w => w.user_id === parseInt(userId)) || null;
    }
  }

  static async updateBalance(userId, { mainDelta = 0, investmentDelta = 0, earningsDelta = 0, depositedDelta = 0, withdrawnDelta = 0 }) {
    if (isPostgresConnected()) {
      await pool.query(
        `UPDATE wallets 
         SET main_balance = main_balance + $1,
             investment_balance = investment_balance + $2,
             total_earnings = total_earnings + $3,
             total_deposited = total_deposited + $4,
             total_withdrawn = total_withdrawn + $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6`,
        [mainDelta, investmentDelta, earningsDelta, depositedDelta, withdrawnDelta, userId]
      );
      const res = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
      return res.rows[0];
    } else {
      const wallet = mockStore.wallets.find(w => w.user_id === parseInt(userId));
      if (!wallet) return null;
      wallet.main_balance = parseFloat((wallet.main_balance + mainDelta).toFixed(2));
      wallet.investment_balance = parseFloat((wallet.investment_balance + investmentDelta).toFixed(2));
      wallet.total_earnings = parseFloat((wallet.total_earnings + earningsDelta).toFixed(2));
      wallet.total_deposited = parseFloat((wallet.total_deposited + depositedDelta).toFixed(2));
      wallet.total_withdrawn = parseFloat((wallet.total_withdrawn + withdrawnDelta).toFixed(2));
      return wallet;
    }
  }
}

module.exports = WalletModel;
