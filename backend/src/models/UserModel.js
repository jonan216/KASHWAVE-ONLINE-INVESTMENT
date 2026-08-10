const { pool, mockStore, isPostgresConnected } = require('../config/db');
const https = require('https');
const env = require('../config/env');

// Direct Supabase RPC call (bypasses exec_sql, calls dedicated RPC function by name)
function supabaseRpc(functionName, payload) {
  return new Promise((resolve, reject) => {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return reject(new Error('Supabase environment not configured'));
    }
    const body = JSON.stringify(payload);
    const url = new URL(`${env.SUPABASE_URL}/rest/v1/rpc/${functionName}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Supabase HTTP-level errors (e.g. 404 function not found, 403 forbidden)
          if (res.statusCode >= 400) {
            const errMsg = parsed?.message || parsed?.error || parsed?.hint || `HTTP ${res.statusCode} from Supabase RPC`;
            return reject(new Error(errMsg));
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Supabase RPC timeout')); });
    req.write(body);
    req.end();
  });
}

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

      const safeDelete = async (query, params = [testUserIds]) => {
        try { await pool.query(query, params); } catch (err) {
          console.warn(`[PURGE WARN] ${query}:`, err.message);
        }
      };

      await safeDelete(`UPDATE deposits SET approved_by_user_id = NULL WHERE approved_by_user_id = ANY($1::int[])`);
      await safeDelete(`UPDATE withdrawals SET approved_by = NULL WHERE approved_by = ANY($1::int[])`);
      await safeDelete(`UPDATE kyc_verification SET reviewed_by = NULL WHERE reviewed_by = ANY($1::int[])`);
      await safeDelete(`UPDATE roi_settings SET created_by = NULL WHERE created_by = ANY($1::int[])`);
      await safeDelete(`DELETE FROM refresh_tokens WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM password_reset_tokens WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM email_verification_tokens WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM csrf_tokens WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM security_events WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM kyc_verification WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM payment_transactions WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM investments WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM transactions WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM deposits WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM withdrawals WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM notifications WHERE user_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM referrals WHERE referrer_id = ANY($1::int[]) OR referee_id = ANY($1::int[])`);
      await safeDelete(`DELETE FROM wallets WHERE user_id = ANY($1::int[])`);
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

      // Try to call admin_delete_user RPC (atomic, handles audit_logs immutability)
      if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
        try {
          const result = await supabaseRpc('admin_delete_user', { target_user_id: id });
          if (result && result.success === false) {
            if (result.message === 'User not found') return null;
            throw new Error(result.message || 'admin_delete_user RPC returned failure');
          }
          // Return the deleted user info from the RPC result
          if (result && result.deleted_user) {
            return result.deleted_user;
          }
          // If RPC returns the user object directly (some Supabase versions)
          return result || { id };
        } catch (rpcErr) {
          console.warn('[DELETE USER] RPC failed, falling back to sequential deletes:', rpcErr.message);
        }
      }

      // Fallback: sequential safe deletes via exec_sql
      const userRes = await pool.query('SELECT id, email, full_name, role, referral_code FROM users WHERE id = $1', [id]);
      const user = userRes.rows[0];
      if (!user) return null;

      const safeDelete = async (query, params = [id]) => {
        try { await pool.query(query, params); } catch (err) {
          console.warn(`[USER DELETE WARN]:`, err.message);
        }
      };

      await safeDelete(`UPDATE deposits SET approved_by_user_id = NULL WHERE approved_by_user_id = $1`);
      await safeDelete(`UPDATE withdrawals SET approved_by = NULL WHERE approved_by = $1`);
      await safeDelete(`UPDATE kyc_verification SET reviewed_by = NULL WHERE reviewed_by = $1`);
      await safeDelete(`UPDATE roi_settings SET created_by = NULL WHERE created_by = $1`);
      if (user.referral_code) {
        await safeDelete(`UPDATE users SET referred_by_code = NULL WHERE referred_by_code = $1`, [user.referral_code]);
      }
      await safeDelete(`DELETE FROM refresh_tokens WHERE user_id = $1`);
      await safeDelete(`DELETE FROM password_reset_tokens WHERE user_id = $1`);
      await safeDelete(`DELETE FROM email_verification_tokens WHERE user_id = $1`);
      await safeDelete(`DELETE FROM csrf_tokens WHERE user_id = $1`);
      await safeDelete(`DELETE FROM security_events WHERE user_id = $1`);
      await safeDelete(`DELETE FROM kyc_verification WHERE user_id = $1`);
      await safeDelete(`DELETE FROM payment_transactions WHERE user_id = $1`);
      await safeDelete(`DELETE FROM investments WHERE user_id = $1`);
      await safeDelete(`DELETE FROM transactions WHERE user_id = $1`);
      await safeDelete(`DELETE FROM deposits WHERE user_id = $1`);
      await safeDelete(`DELETE FROM withdrawals WHERE user_id = $1`);
      await safeDelete(`DELETE FROM notifications WHERE user_id = $1`);
      await safeDelete(`DELETE FROM referrals WHERE referrer_id = $1 OR referee_id = $1`);
      await safeDelete(`DELETE FROM wallets WHERE user_id = $1`);

      // NOTE: audit_logs are IMMUTABLE — do NOT delete from audit_logs.
      // audit_logs.user_id will be set to NULL automatically by ON DELETE SET NULL FK.
      try {
        await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
      } catch (finalErr) {
        throw new Error(`Failed to delete user: ${finalErr.message}`);
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
