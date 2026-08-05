const { pool, mockStore, isPostgresConnected } = require('../config/db');

class TransactionModel {
  static async getByUserId(userId) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return res.rows;
    } else {
      return mockStore.transactions
        .filter(t => t.user_id === parseInt(userId))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  static async getAll() {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `SELECT t.*, u.full_name, u.email
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC`
      );
      return res.rows;
    } else {
      return mockStore.transactions.map(t => {
        const user = mockStore.users.find(u => u.id === t.user_id) || {};
        return {
          ...t,
          full_name: user.full_name,
          email: user.email
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  static async findById(id) {
    if (isPostgresConnected()) {
      const res = await pool.query("SELECT * FROM transactions WHERE id = $1", [id]);
      return res.rows[0] || null;
    } else {
      return mockStore.transactions.find(t => t.id === parseInt(id)) || null;
    }
  }

  static async create({ userId, type, amount, fee = 0, status = 'pending', payment_method = 'USDT (TRC20)', wallet_address = null, proof_reference = null, admin_notes = null }) {
    const referenceCode = `KW-${type.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isPostgresConnected()) {
      const res = await pool.query(
        `INSERT INTO transactions 
         (reference_code, user_id, type, amount, fee, status, payment_method, wallet_address, proof_reference, admin_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [referenceCode, userId, type, amount, fee, status, payment_method, wallet_address, proof_reference, admin_notes]
      );
      return res.rows[0];
    } else {
      const newId = mockStore.transactions.length ? Math.max(...mockStore.transactions.map(t => t.id)) + 1 : 501;
      const tx = {
        id: newId,
        reference_code: referenceCode,
        user_id: parseInt(userId),
        type,
        amount: parseFloat(amount),
        fee: parseFloat(fee),
        status,
        payment_method,
        wallet_address,
        proof_reference,
        admin_notes,
        created_at: new Date().toISOString()
      };
      mockStore.transactions.push(tx);
      return tx;
    }
  }

  static async updateStatus(id, status, admin_notes = null) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        "UPDATE transactions SET status = $1, admin_notes = COALESCE($2, admin_notes) WHERE id = $3 RETURNING *",
        [status, admin_notes, id]
      );
      return res.rows[0];
    } else {
      const tx = mockStore.transactions.find(t => t.id === parseInt(id));
      if (!tx) return null;
      tx.status = status;
      if (admin_notes) tx.admin_notes = admin_notes;
      return tx;
    }
  }
}

module.exports = TransactionModel;
