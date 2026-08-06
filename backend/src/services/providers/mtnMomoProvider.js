/**
 * MTN Mobile Money Provider — Live Integration
 * MTN MoMo Collection API (Request to Pay)
 * Sandbox: https://sandbox.momodeveloper.mtn.com
 * Production: https://momodeveloper.mtn.com
 */
const https = require('https');

const MTN_BASE_URL = process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const MTN_API_KEY = process.env.MTN_MOMO_API_KEY;
const MTN_SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const MTN_ENVIRONMENT = process.env.MTN_MOMO_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

const getHeaders = () => ({
  'Authorization': `Bearer ${MTN_API_KEY}`,
  'X-Target-Environment': MTN_ENVIRONMENT,
  'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION_KEY,
  'Content-Type': 'application/json'
});

const initPayment = async ({ amount, currency = 'UGX', phone, reference }) => {
  if (!MTN_API_KEY || !MTN_SUBSCRIPTION_KEY) {
    throw new Error('MTN MoMo API credentials not configured');
  }

  const payload = {
    amount: Number(amount).toFixed(2),
    currency,
    externalId: reference,
      payer: {
        partyIdType: 'MSISDN',
        partyId: (phone || '').replace('+', '')
      },
    payerMessage: `Payment of ${currency} ${Number(amount).toLocaleString()} to KashWave`,
    payeeNote: `Deposit from ${phone}`
  };

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(MTN_BASE_URL).hostname,
      path: `/collection/v1_0/requesttopay`,
      method: 'POST',
      headers: getHeaders()
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 202 || res.statusCode === 200) {
            resolve({
              provider: 'mtn_momo',
              reference: parsed.financialTransactionId || reference,
              transaction_id: parsed.financialTransactionId,
              status: 'pending',
              message: 'Payment request sent. Please check your phone for PIN prompt.',
              raw: parsed
            });
          } else {
            reject(new Error(parsed.message || 'MTN MoMo payment request failed'));
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

const verifyPayment = async (reference) => {
  if (!MTN_API_KEY || !MTN_SUBSCRIPTION_KEY) {
    return { verified: false, reference, reason: 'API credentials not configured' };
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(MTN_BASE_URL).hostname,
      path: `/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: getHeaders()
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const status = (parsed.status || '').toLowerCase();
          resolve({
            verified: status === 'success' || status === 'completed',
            reference,
            status: parsed.status,
            amount: parsed.amount,
            currency: parsed.currency,
            raw: parsed
          });
        } catch (e) {
          resolve({ verified: false, reference, reason: 'Parse error' });
        }
      });
    });

    req.on('error', () => resolve({ verified: false, reference, reason: 'Network error' }));
    req.end();
  });
};

module.exports = { initPayment, verifyPayment };
