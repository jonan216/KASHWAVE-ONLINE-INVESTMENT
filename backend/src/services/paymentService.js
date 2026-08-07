/**
 * KashWave Payment Service Abstraction
 * Strategy pattern — new payment providers can be added without changing core logic.
 * All payments MUST be verified via webhook before crediting wallets.
 */

const crypto = require('crypto');
const { pool, mockStore, isPostgresConnected } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');
const env = require('../config/env');

// ─── Provider Registry ──────────────────────────────────────────────────────
const providers = {
  mtn_momo:     require('./providers/mtnMomoProvider'),
  airtel_money: require('./providers/airtelMoneyProvider'),
  card:         require('./providers/cardProvider'),
  manual:       require('./providers/manualProvider'),
  marz_innovations: require('./providers/marzInnovationsProvider'),
};

// ─── Generate unique internal reference ────────────────────────────────────
const generateReference = (prefix = 'KW-PAY') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ─── Create Payment Request ─────────────────────────────────────────────────
const createPaymentRequest = async ({ userId, amount, currency = 'UGX', provider = 'manual', direction = 'inbound', phone }) => {
  const internalRef = generateReference('KW-DEP');
  const providerRef = `EXT-${Date.now()}`;
  const providerInstance = providers[provider];

  if (!providerInstance) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }

  const providerResult = await providerInstance.initPayment({
    amount, currency, reference: internalRef, phone: phone || null
  });

  if (isPostgresConnected() && pool) {
    if (pool.constructor.name === 'HttpPool') {
      await pool.query(
        `INSERT INTO payment_transactions
           (user_id, provider, reference_number, internal_reference, amount, currency, direction, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
        [userId, provider, providerRef, internalRef, amount, currency, direction]
      );
      const result = await pool.query(
        `SELECT * FROM payment_transactions WHERE internal_reference = $1 ORDER BY id DESC LIMIT 1`,
        [internalRef]
      );
      return { ...result.rows[0], providerResponse: providerResult };
    }
    const result = await pool.query(
      `INSERT INTO payment_transactions
         (user_id, provider, reference_number, internal_reference, amount, currency, direction, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
       RETURNING *`,
      [userId, provider, providerRef, internalRef, amount, currency, direction]
    );
    return { ...result.rows[0], providerResponse: providerResult };
  }

  const record = {
    id: Date.now(),
    user_id: userId, provider, reference_number: providerRef,
    internal_reference: internalRef, amount, currency, direction,
    status: 'pending', signature_verified: false,
    wallet_credited: false, created_at: new Date().toISOString()
  };
  mockStore.payment_transactions = mockStore.payment_transactions || [];
  mockStore.payment_transactions.push(record);
  return { ...record, providerResponse: providerResult };
};

// ─── Verify Webhook Signature ───────────────────────────────────────────────
const verifyWebhookSignature = (providerName, payload, signature, secret) => {
  if (!secret || !signature) return false;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
};

// ─── Process Verified Webhook ───────────────────────────────────────────────
const processVerifiedWebhook = async ({ providerName, rawPayload, signature, req }) => {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  const signatureValid = verifyWebhookSignature(providerName, rawPayload, signature, secret);

  if (!signatureValid) {
    await writeAuditLog({
      action: 'webhook_signature_invalid',
      description: `Rejected unsigned webhook from provider: ${providerName}`,
      ipAddress: req?.ip,
      deviceInformation: req?.headers?.['user-agent'],
      severity: 'critical'
    });
    throw new Error('INVALID_WEBHOOK_SIGNATURE');
  }

  const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  const providerRef = payload.reference || payload.transaction_id || payload.id;
  const amount = parseFloat(payload.amount || 0);
  const status = (payload.status || '').toLowerCase();

  if (!providerRef || !amount) throw new Error('MALFORMED_WEBHOOK_PAYLOAD');

  if (isPostgresConnected() && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find pending payment record by reference_number or internal_reference
      let txResult = await client.query(
        `SELECT * FROM payment_transactions WHERE reference_number = $1 FOR UPDATE`,
        [providerRef]
      );
      let tx = txResult.rows[0];
      if (!tx) {
        txResult = await client.query(
          `SELECT * FROM payment_transactions WHERE internal_reference = $1 FOR UPDATE`,
          [providerRef]
        );
        tx = txResult.rows[0];
      }
      if (!tx) throw new Error('PAYMENT_RECORD_NOT_FOUND');
      if (tx.wallet_credited) throw new Error('DUPLICATE_WEBHOOK_ATTEMPT');

      if (status === 'success' || status === 'completed' || status === 'successful') {
        await client.query(
          `UPDATE wallets SET main_balance = main_balance + $1, total_deposited = total_deposited + $1
           WHERE user_id = $2`,
          [tx.amount, tx.user_id]
        );

        await client.query(
          `UPDATE transactions SET status='completed', payment_method=$1, admin_notes=COALESCE($2, admin_notes)
           WHERE proof_reference=$3`,
          [tx.provider, `Confirmed via ${providerName} webhook`, tx.internal_reference]
        );

        await client.query(
          `UPDATE payment_transactions SET status='credited', wallet_credited=TRUE,
           signature_verified=TRUE, webhook_payload=$1 WHERE id=$2`,
          [JSON.stringify(payload), tx.id]
        );

        await writeAuditLog({
          userId: tx.user_id,
          action: 'deposit_webhook_credited',
          description: `UGX ${tx.amount} credited via ${providerName} webhook`,
          severity: 'info',
          resourceType: 'wallet',
          resourceId: tx.user_id
        });
      } else {
        await client.query(
          `UPDATE payment_transactions SET status='failed', failure_reason=$1, webhook_payload=$2
           WHERE id=$3`,
          [status, JSON.stringify(payload), tx.id]
        );
      }

      await client.query('COMMIT');
      return { credited: status === 'success' || status === 'completed' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return { credited: false, message: 'Mock mode — webhook processed without DB write' };
};

module.exports = { createPaymentRequest, verifyWebhookSignature, processVerifiedWebhook, generateReference };
