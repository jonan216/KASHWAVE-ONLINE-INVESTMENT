const crypto = require('crypto');
const { pool, mockStore, isPostgresConnected } = require('../config/db');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function recordFailedLogin(email) {
  const key = `login_failures:${email.toLowerCase()}`;
  try {
    if (isPostgresConnected() && pool) {
      const result = await pool.query(
        `SELECT * FROM security_events WHERE event_type = 'login_failure' AND LOWER(email) = LOWER($1) AND created_at > NOW() - INTERVAL '15 minutes' ORDER BY created_at DESC`,
        [email]
      );
      const failures = result.rows.length;
      if (failures >= MAX_FAILED_ATTEMPTS) {
        const earliest = result.rows[result.rows.length - 1].created_at;
        const lockUntil = new Date(new Date(earliest).getTime() + LOCKOUT_DURATION_MS);
        if (new Date() < lockUntil) {
          return { locked: true, lockUntil };
        }
      }
      try {
        await pool.query(
          `INSERT INTO security_events (event_type, email, created_at) VALUES ('login_failure', $1, NOW())`,
          [email]
        );
      } catch (insertErr) {
        console.error('[ACCOUNT_LOCKOUT] Failed to record login failure:', insertErr.message);
      }
      return { locked: false, attempts: failures + 1 };
    } else {
      const key = `login_failures:${email.toLowerCase()}`;
      if (!mockStore.security_events) mockStore.security_events = [];
      const cutoff = new Date(Date.now() - LOCKOUT_DURATION_MS);
      const failures = mockStore.security_events.filter(e => e.event_type === 'login_failure' && e.email.toLowerCase() === email.toLowerCase() && new Date(e.created_at) > cutoff);
      if (failures.length >= MAX_FAILED_ATTEMPTS) {
        const earliest = failures[failures.length - 1].created_at;
        const lockUntil = new Date(new Date(earliest).getTime() + LOCKOUT_DURATION_MS);
        if (new Date() < lockUntil) {
          return { locked: true, lockUntil };
        }
      }
      mockStore.security_events.push({ id: Date.now(), event_type: 'login_failure', email, created_at: new Date().toISOString() });
      return { locked: false, attempts: failures.length + 1 };
    }
  } catch (err) {
    console.error('[ACCOUNT_LOCKOUT] Error:', err.message);
    return { locked: false };
  }
}

async function clearFailedLogins(email) {
  try {
    if (isPostgresConnected() && pool) {
      await pool.query(`DELETE FROM security_events WHERE event_type = 'login_failure' AND LOWER(email) = LOWER($1)`, [email]);
    } else {
      if (mockStore.security_events) {
        mockStore.security_events = mockStore.security_events.filter(e => !(e.event_type === 'login_failure' && e.email.toLowerCase() === email.toLowerCase()));
      }
    }
  } catch (err) {
    console.error('[ACCOUNT_LOCKOUT] Failed to clear login failures:', err.message);
  }
}

async function isAccountLocked(email) {
  try {
    const result = await recordFailedLogin(email);
    return result.locked ? result.lockUntil : null;
  } catch (err) {
    console.error('[ACCOUNT_LOCKOUT] Lock check failed:', err.message);
    return null;
  }
}

module.exports = { recordFailedLogin, clearFailedLogins, isAccountLocked, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS };
