const crypto = require('crypto');
const { pool, mockStore, isPostgresConnected } = require('../config/db');

const CSRF_TOKEN_VALIDITY_MS = 2 * 60 * 60 * 1000; // 2 hours

async function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CSRF_TOKEN_VALIDITY_MS);
  if (isPostgresConnected() && pool) {
    await pool.query(
      `INSERT INTO csrf_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  } else {
    if (!mockStore.csrf_tokens) mockStore.csrf_tokens = [];
    mockStore.csrf_tokens.push({ user_id: userId, token, expires_at: expiresAt.toISOString() });
  }
  return token;
}

async function validateCsrfToken(userId, token) {
  if (!token) return false;
  if (isPostgresConnected() && pool) {
    const result = await pool.query(
      `SELECT * FROM csrf_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW() LIMIT 1`,
      [userId, token]
    );
    if (result.rows.length > 0) {
      await pool.query(`DELETE FROM csrf_tokens WHERE user_id = $1 AND token = $2`, [userId, token]);
      return true;
    }
    return false;
  } else {
    if (!mockStore.csrf_tokens) return false;
    const idx = mockStore.csrf_tokens.findIndex(t => t.user_id === userId && t.token === token && new Date(t.expires_at) > new Date());
    if (idx !== -1) {
      mockStore.csrf_tokens.splice(idx, 1);
      return true;
    }
    return false;
  }
}

async function rotateRefreshToken(oldToken) {
  const oldHash = crypto.createHash('sha256').update(oldToken).digest('hex');
  let oldRecord = null;
  if (isPostgresConnected() && pool) {
    const result = await pool.query(`SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`, [oldHash]);
    oldRecord = result.rows[0];
    if (!oldRecord) return null;
    if (oldRecord.revoked) return null;
    if (new Date(oldRecord.expires_at) < new Date()) return null;
    await pool.query('BEGIN');
    await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [oldRecord.id]);
    const { RefreshTokenModel } = require('../models/RefreshTokenModel');
    const newToken = await RefreshTokenModel.create(oldRecord.user_id);
    await pool.query('COMMIT');
    return newToken;
  } else {
    oldRecord = mockStore.refresh_tokens.find(t => t.token_hash === oldHash && !t.revoked);
    if (!oldRecord) return null;
    if (new Date(oldRecord.expires_at) < new Date()) return null;
    oldRecord.revoked = true;
    const { RefreshTokenModel } = require('../models/RefreshTokenModel');
    return RefreshTokenModel.create(oldRecord.user_id);
  }
}

module.exports = { generateCsrfToken, validateCsrfToken, rotateRefreshToken, CSRF_TOKEN_VALIDITY_MS };
