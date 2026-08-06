/**
 * Card Payment Provider — Live Integration
 * Visa/Mastercard via Flutterwave
 * Supports card payments with automatic verification
 */
const https = require('https');
const crypto = require('crypto');

const FLUTTERWAVE_BASE_URL = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY;

const initPayment = async ({ amount, currency = 'UGX', phone, reference, email }) => {
  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error('Flutterwave API credentials not configured');
  }

  const payload = {
    tx_ref: reference,
    amount: Number(amount),
    currency: 'UGX',
    redirect_url: process.env.FLUTTERWAVE_REDIRECT_URL || 'https://kashwave-online-investment.vercel.app/dashboard/transactions',
    payment_type: 'card',
    customer: {
      email: email || 'customer@kashwave.com',
      phone_number: phone || 'N/A'
    },
    customizations: {
      title: 'KashWave Investment Platform',
      description: `Deposit of UGX ${Number(amount).toLocaleString()}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(FLUTTERWAVE_BASE_URL).hostname,
      path: '/payments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload))
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success' && parsed.data) {
            resolve({
              provider: 'flutterwave_card',
              reference: parsed.data.tx_ref || reference,
              transaction_id: parsed.data.id,
              status: 'pending',
              message: 'Payment initiated. Please complete payment on the redirect page.',
              payment_link: parsed.data.link,
              raw: parsed
            });
          } else {
            reject(new Error(parsed.message || 'Flutterwave payment initiation failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
};

const verifyPayment = async (reference, transactionId) => {
  if (!FLUTTERWAVE_SECRET_KEY) {
    return { verified: false, reference, reason: 'API credentials not configured' };
  }

  const txId = transactionId || reference;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(FLUTTERWAVE_BASE_URL).hostname,
      path: `/transactions/${txId}/verify`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success' && parsed.data) {
            const status = (parsed.data.status || '').toLowerCase();
            resolve({
              verified: status === 'successful' || status === 'completed',
              reference: parsed.data.tx_ref,
              transaction_id: parsed.data.id,
              status: parsed.data.status,
              amount: parsed.data.amount,
              currency: parsed.data.currency,
              raw: parsed
            });
          } else {
            resolve({ verified: false, reference, reason: parsed.message || 'Verification failed' });
          }
        } catch (e) {
          resolve({ verified: false, reference, reason: 'Parse error' });
        }
      });
    });

    req.on('error', () => resolve({ verified: false, reference, reason: 'Network error' }));
    req.end();
  });
};

const verifyWebhook = (payload, signature) => {
  if (!FLUTTERWAVE_SECRET_KEY || !signature) return false;
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
};

module.exports = { initPayment, verifyPayment, verifyWebhook };
