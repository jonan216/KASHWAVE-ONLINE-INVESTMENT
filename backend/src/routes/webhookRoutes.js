/**
 * Payment Webhook Routes
 * All payment providers send server-to-server POST callbacks here.
 * Raw body required for HMAC signature verification — use express.raw()
 */
const express = require('express');
const { processVerifiedWebhook, verifyWebhookSignature } = require('../services/paymentService');
const { writeAuditLog } = require('../middleware/auditLogger');

const router = express.Router();

// Important: webhook endpoints use raw body for signature verification
router.use(express.raw({ type: 'application/json' }));

// POST /api/webhooks/mtn — MTN Mobile Money callback
router.post('/mtn', async (req, res) => {
  try {
    const signature = req.headers['x-mtn-signature'] || req.headers['authorization'];
    await processVerifiedWebhook({ providerName: 'mtn_momo', rawPayload: req.body, signature, req });
    res.status(200).json({ status: 'received' });
  } catch (err) {
    await writeAuditLog({ action: 'webhook_error', description: `MTN webhook error: ${err.message}`, severity: 'critical', ipAddress: req.ip });
    if (err.message === 'INVALID_WEBHOOK_SIGNATURE') return res.status(401).json({ error: 'Invalid signature' });
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/webhooks/airtel — Airtel Money callback
router.post('/airtel', async (req, res) => {
  try {
    const signature = req.headers['x-airtel-signature'];
    await processVerifiedWebhook({ providerName: 'airtel_money', rawPayload: req.body, signature, req });
    res.status(200).json({ status: 'received' });
  } catch (err) {
    await writeAuditLog({ action: 'webhook_error', description: `Airtel webhook error: ${err.message}`, severity: 'critical', ipAddress: req.ip });
    if (err.message === 'INVALID_WEBHOOK_SIGNATURE') return res.status(401).json({ error: 'Invalid signature' });
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/webhooks/manual — Admin-verified manual payment confirmation
router.post('/manual', async (req, res) => {
  // Manual webhooks are triggered by our own admin system, they use internal secrets
  try {
    const signature = req.headers['x-kashwave-signature'];
    await processVerifiedWebhook({ providerName: 'manual', rawPayload: req.body, signature, req });
    res.status(200).json({ status: 'received' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/webhooks/flutterwave — Flutterwave card payment callback
router.post('/flutterwave', async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    await processVerifiedWebhook({ providerName: 'card', rawPayload: req.body, signature, req });
    res.status(200).json({ status: 'received' });
  } catch (err) {
    await writeAuditLog({ action: 'webhook_error', description: `Flutterwave webhook error: ${err.message}`, severity: 'critical', ipAddress: req.ip });
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/webhooks/marz — MarzPay collection callback
router.post('/marz', async (req, res) => {
  try {
    const signature = req.headers['x-marz-signature'] || req.headers['authorization'];
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const rawBody = req.body;

    let signatureValid = true;
    if (webhookSecret && signature) {
      signatureValid = verifyWebhookSignature('marz_innovations', rawBody, signature, webhookSecret);
      if (!signatureValid) {
        await writeAuditLog({ action: 'webhook_signature_invalid', description: 'Invalid MarzPay webhook signature', severity: 'warning', ipAddress: req.ip });
      }
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    console.log('[MARZ WEBHOOK RECEIVED]', payload);

    const normalizedPayload = {
      reference: payload.transaction?.reference || payload.reference || payload.internal_reference,
      transaction_id: payload.transaction?.uuid || payload.transaction?.id || payload.id,
      amount: payload.collection?.amount?.raw || payload.amount || payload.transaction?.amount,
      status: payload.transaction?.status || payload.status || 'success',
      provider: payload.collection?.provider || payload.provider || 'marz_innovations',
      phone_number: payload.transaction?.phone_number || payload.phone_number,
      event_type: payload.event_type || 'payment.success',
      raw: payload
    };

    await processVerifiedWebhook({
      providerName: 'marz_innovations',
      rawPayload: normalizedPayload,
      signature,
      req,
      skipSignatureVerification: true
    });
    res.status(200).json({ status: 'received', message: 'Webhook processed successfully' });
  } catch (err) {
    await writeAuditLog({ action: 'webhook_error', description: `MarzPay webhook error: ${err.message}`, severity: 'critical', ipAddress: req.ip });
    console.error('[MARZ WEBHOOK ERROR]', err);
    res.status(500).json({ error: 'Internal error processing MarzPay webhook', details: err.message });
  }
});

module.exports = router;
