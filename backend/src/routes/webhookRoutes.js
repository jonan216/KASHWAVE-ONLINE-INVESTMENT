/**
 * Payment Webhook Routes
 * All payment providers send server-to-server POST callbacks here.
 * Raw body required for HMAC signature verification — use express.raw()
 */
const express = require('express');
const { processVerifiedWebhook } = require('../services/paymentService');
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

// POST /api/webhooks/marz — Marz Innovations deposit callback
router.post('/marz', async (req, res) => {
  try {
    const signature = req.headers['x-marz-signature'] || req.headers['authorization'];
    await processVerifiedWebhook({ providerName: 'marz_innovations', rawPayload: req.body, signature, req });
    res.status(200).json({ status: 'received' });
  } catch (err) {
    await writeAuditLog({ action: 'webhook_error', description: `Marz Innovations webhook error: ${err.message}`, severity: 'critical', ipAddress: req.ip });
    if (err.message === 'INVALID_WEBHOOK_SIGNATURE') return res.status(401).json({ error: 'Invalid signature' });
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
