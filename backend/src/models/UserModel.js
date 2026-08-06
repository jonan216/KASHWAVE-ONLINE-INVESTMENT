const { pool, mockStore, isPostgresConnected } = require('../config/db');

class UserModel {
  static async findByEmail(email) {
    if (isPostgresConnected()) {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] || null;
    } else {
      return mockStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  }

  static async findByReferralCode(code) {
    if (isPostgresConnected()) {
      const res = await pool.query('SELECT * FROM users WHERE referral_code = $1', [code]);
      return res.rows[0] || null;
    } else {
      return mockStore.users.find(u => u.referral_code === code) || null;
    }
  }

  static async findById(id) {
    if (isPostgresConnected()) {
      const res = await pool.query('SELECT id, full_name, email, role, is_email_verified, two_factor_enabled, two_factor_secret, status, created_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } else {
      const user = mockStore.users.find(u => u.id === parseInt(id));
      if (!user) return null;
      const { password_hash, ...userWithoutPass } = user;
      return userWithoutPass;
    }
  }

  static async findByIdWithPassword(id) {
    if (isPostgresConnected()) {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } else {
      return mockStore.users.find(u => u.id === parseInt(id)) || null;
    }
  }

  static async create({ full_name, email, password_hash, role = 'user' }) {
    if (isPostgresConnected()) {
      // Generate a unique referral code: KW- + 8 random alphanumeric chars
      const referral_code = 'KW-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      if (pool.constructor.name === 'HttpPool') {
        // HTTP mode: no transaction support, no INSERT...RETURNING
        // Use INSERT (no RETURNING) followed by SELECT to get the created row
        await pool.query(
          `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [full_name, email, password_hash, role, true, referral_code]
        );
        const userRes = await pool.query(
          'SELECT id, full_name, email, role, status, referral_code, created_at FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1',
          [email]
        );
        const newUser = userRes.rows[0];

        // Create corresponding wallet
        await pool.query(
          `INSERT INTO wallets (user_id, main_balance, investment_balance, total_earnings, total_deposited, total_withdrawn)
           VALUES ($1, 0.00, 0.00, 0.00, 0.00, 0.00)`,
          [newUser.id]
        );

        return newUser;
      } else {
        // TCP Pool mode: full transaction support
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const userRes = await client.query(
            `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role, status, referral_code, created_at`,
            [full_name, email, password_hash, role, true, referral_code]
          );
          const newUser = userRes.rows[0];

          await client.query(
            `INSERT INTO wallets (user_id, main_balance, investment_balance, total_earnings, total_deposited, total_withdrawn)
             VALUES ($1, 0.00, 0.00, 0.00, 0.00, 0.00)`,
            [newUser.id]
          );

          await client.query('COMMIT');
          return newUser;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } else {
      const newId = mockStore.users.length ? Math.max(...mockStore.users.map(u => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        full_name,
        email,
        password_hash,
        role,
        is_email_verified: true,
        two_factor_enabled: false,
        two_factor_secret: null,
        status: 'active',
        created_at: new Date().toISOString()
      };
      mockStore.users.push(newUser);
      
      // Initialize wallet
      mockStore.wallets.push({
        id: mockStore.wallets.length + 1,
        user_id: newId,
        main_balance: 0.00,
        investment_balance: 0.00,
        total_earnings: 0.00,
        total_deposited: 0.00,
        total_withdrawn: 0.00
      });

      const { password_hash: _, ...userClean } = newUser;
      return userClean;
    }
  }

  static async update2FASecret(userId, secret, enabled) {
    if (isPostgresConnected()) {
      await pool.query(
        'UPDATE users SET two_factor_secret = $1, two_factor_enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [secret, enabled, userId]
      );
    } else {
      const user = mockStore.users.find(u => u.id === parseInt(userId));
      if (user) {
        user.two_factor_secret = secret;
        user.two_factor_enabled = enabled;
      }
    }
  }

  static async updatePassword(userId, password_hash) {
    if (isPostgresConnected()) {
      await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [password_hash, userId]);
    } else {
      const user = mockStore.users.find(u => u.id === parseInt(userId));
      if (user) {
        user.password_hash = password_hash;
      }
    }
  }

  static async getAllUsers() {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.status, u.created_at, 
                w.main_balance, w.investment_balance, w.total_earnings
         FROM users u
         LEFT JOIN wallets w ON u.id = w.user_id
         ORDER BY u.id DESC`
      );
      return res.rows;
    } else {
      return mockStore.users.map(u => {
        const wallet = mockStore.wallets.find(w => w.user_id === u.id) || {};
        const { password_hash, ...userClean } = u;
        return {
          ...userClean,
          main_balance: wallet.main_balance || 0,
          investment_balance: wallet.investment_balance || 0,
          total_earnings: wallet.total_earnings || 0
        };
      });
    }
  }

  static async updateUserStatus(userId, status) {
    if (isPostgresConnected()) {
      await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, userId]);
    } else {
      const user = mockStore.users.find(u => u.id === parseInt(userId));
      if (user) user.status = status;
    }
  }
}

module.exports = UserModel;
