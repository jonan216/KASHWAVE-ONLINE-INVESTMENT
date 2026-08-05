const { pool, mockStore, isPostgresConnected } = require('../config/db');

class RefreshTokenModel {
  static async create(userId, tokenHash, expiresAt) {
    if (isPostgresConnected() && pool) {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
      );
    } else {
      mockStore.refresh_tokens.push({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt
      });
    }
  }

  static async findByToken(tokenHash) {
    if (isPostgresConnected() && pool) {
      const res = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );
      return res.rows[0] || null;
    }
    return mockStore.refresh_tokens.find(
      t => t.token_hash === tokenHash && new Date(t.expires_at) > new Date()
    ) || null;
  }

  static async findByUserId(userId) {
    if (isPostgresConnected() && pool) {
      const res = await pool.query(
        `SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()`,
        [userId]
      );
      return res.rows;
    }
    return mockStore.refresh_tokens.filter(
      t => t.user_id === parseInt(userId) && new Date(t.expires_at) > new Date()
    );
  }

  static async delete(tokenHash) {
    if (isPostgresConnected() && pool) {
      await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
    } else {
      mockStore.refresh_tokens = mockStore.refresh_tokens.filter(t => t.token_hash !== tokenHash);
    }
  }

  static async deleteAllForUser(userId) {
    if (isPostgresConnected() && pool) {
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    } else {
      mockStore.refresh_tokens = mockStore.refresh_tokens.filter(t => t.user_id !== parseInt(userId));
    }
  }
}

module.exports = RefreshTokenModel;
