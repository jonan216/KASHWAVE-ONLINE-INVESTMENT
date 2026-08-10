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
      const res = await pool.query('SELECT id, full_name, email, role, is_email_verified, status, has_received_welcome_bonus, created_at FROM users WHERE id = $1', [id]);
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

  static async create({ full_name, email, password_hash, role = 'user', referred_by_code = null }) {
    if (isPostgresConnected()) {
      const referral_code = 'KW-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      if (pool.constructor.name === 'HttpPool') {
        await pool.query(
          `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code, referred_by_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [full_name, email, password_hash, role, true, referral_code, referred_by_code]
        );
        const userRes = await pool.query(
          'SELECT id, full_name, email, role, status, referral_code, referred_by_code, created_at FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1',
          [email]
        );
        const newUser = userRes.rows[0];

        await pool.query(
          `INSERT INTO wallets (user_id, main_balance, investment_balance, total_earnings, total_deposited, total_withdrawn)
           VALUES ($1, 0.00, 0.00, 0.00, 0.00, 0.00)`,
          [newUser.id]
        );

        return newUser;
      } else {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const userRes = await client.query(
            `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code, referred_by_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name, email, role, status, referral_code, referred_by_code, created_at`,
            [full_name, email, password_hash, role, true, referral_code, referred_by_code]
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
        referred_by_code: referred_by_code,
        status: 'active',
        created_at: new Date().toISOString()
      };
      mockStore.users.push(newUser);
      
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

  static async getReferredUsers(referrerId) {
    if (isPostgresConnected()) {
      const res = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.created_at, r.level, r.commission_rate, r.earned_amount, r.status
         FROM referrals r
         JOIN users u ON r.referee_id = u.id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC`,
        [referrerId]
      );
      return res.rows;
    } else {
      return mockStore.referrals
        .filter(r => r.referrer_id === parseInt(referrerId))
        .map(r => {
          const referee = mockStore.users.find(u => u.id === r.referee_id) || {};
          return {
            ...referee,
            level: r.level,
            commission_rate: r.commission_rate,
            earned_amount: r.earned_amount || 0,
            status: r.status || 'active'
          };
        });
    }
  }

  static async setEmailVerified(userId, verified) {
    if (isPostgresConnected()) {
      await pool.query('UPDATE users SET is_email_verified = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [verified, userId]);
    } else {
      const user = mockStore.users.find(u => u.id === parseInt(userId));
      if (user) user.is_email_verified = verified;
    }
  }

  static async purgeTestAccounts() {
    if (isPostgresConnected() && pool) {
      const testUsersRes = await pool.query(
        `SELECT id, email, full_name FROM users 
         WHERE LOWER(email) LIKE '%test%' 
            OR LOWER(full_name) LIKE '%test%'`
      );
      const testUserIds = testUsersRes.rows.map(u => u.id);
      if (testUserIds.length === 0) return { count: 0, deletedUsers: [] };

      await pool.query(`DELETE FROM audit_logs WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM kyc_verification WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM payment_transactions WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM investments WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM transactions WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM referrals WHERE referrer_id = ANY($1::int[]) OR referee_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM wallets WHERE user_id = ANY($1::int[])`, [testUserIds]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [testUserIds]);

      return { count: testUserIds.length, deletedUsers: testUsersRes.rows };
    } else {
      const testUsers = (mockStore.users || []).filter(
        u => (u.email || '').toLowerCase().includes('test') || (u.full_name || '').toLowerCase().includes('test')
      );
      const testUserIds = testUsers.map(u => u.id);

      mockStore.users = (mockStore.users || []).filter(u => !testUserIds.includes(u.id));
      mockStore.wallets = (mockStore.wallets || []).filter(w => !testUserIds.includes(w.user_id));
      mockStore.transactions = (mockStore.transactions || []).filter(t => !testUserIds.includes(t.user_id));
      mockStore.investments = (mockStore.investments || []).filter(i => !testUserIds.includes(i.user_id));
      mockStore.referrals = (mockStore.referrals || []).filter(r => !testUserIds.includes(r.referrer_id) && !testUserIds.includes(r.referee_id));

      return { count: testUserIds.length, deletedUsers: testUsers };
    }
  }

  static async deleteUserById(userId) {
    const id = parseInt(userId);
    if (isPostgresConnected() && pool) {
      const userRes = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [id]);
      const user = userRes.rows[0];
      if (!user) return null;

      try {
        await pool.query('SELECT delete_user_cascade($1)', [id]);
      } catch (rpcErr) {
        // Fallback to explicit DELETE queries if RPC function is not installed yet
        await pool.query(`DELETE FROM audit_logs WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM kyc_verification WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM payment_transactions WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM investments WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM transactions WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM deposits WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM withdrawals WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM referrals WHERE referrer_id = $1 OR referee_id = $1`, [id]);
        await pool.query(`DELETE FROM wallets WHERE user_id = $1`, [id]);
        await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
      }

      return user;
    } else {
      const user = (mockStore.users || []).find(u => u.id === id);
      if (!user) return null;

      mockStore.users = (mockStore.users || []).filter(u => u.id !== id);
      mockStore.wallets = (mockStore.wallets || []).filter(w => w.user_id !== id);
      mockStore.transactions = (mockStore.transactions || []).filter(t => t.user_id !== id);
      mockStore.investments = (mockStore.investments || []).filter(i => i.user_id !== id);
      mockStore.referrals = (mockStore.referrals || []).filter(r => r.referrer_id !== id && r.referee_id !== id);

      return user;
    }
  }
}

module.exports = UserModel;
