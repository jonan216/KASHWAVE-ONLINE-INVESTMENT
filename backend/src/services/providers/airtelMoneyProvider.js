/**
 * Airtel Money Provider — Live Integration
 * Airtel Money Uganda Collection API
 */
const https = require('https');

const AIRTEL_BASE_URL = process.env.AIRTEL_MONEY_BASE_URL || 'https://openapi.airtel.ug';
const AIRTEL_CLIENT_ID = process.env.AIRTEL_MONEY_CLIENT_ID;
const AIRTEL_CLIENT_SECRET = process.env.AIRTEL_MONEY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!AIRTEL_MONEY_CLIENT_ID || !AIRTEL_MONEY_CLIENT_SECRET) {
    throw new Error('Airtel Money API credentials not configured');
  }

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${AIRTEL_MONEY_CLIENT_ID}:${AIRTEL_MONEY_CLIENT_SECRET}`).toString('base64');
    const payload = JSON.stringify({ grant_type: 'client_credentials' });

    const req = https.request({
      hostname: new URL(AIRTEL_BASE_URL).hostname,
      path: '/auth/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            accessToken = parsed.access_token;
            tokenExpiry = Date.now() + (parsed.expires_in || 3600) * 1000 - 60000;
            resolve(accessToken);
          } else {
            reject(new Error(parsed.error_description || 'Airtel auth failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const initPayment = async ({ amount, currency = 'UGX', phone, reference }) => {
  const token = await getAccessToken();

  const payload = {
    reference: reference,
      subscriber: {
        country: 'UG',
        currency: 'UGX',
        msisdn: (phone || '').replace('+', '')
      },
    transaction: {
      amount: Number(amount),
      currency: 'UGX'
    },
    transaction_type: 'collection'
  };

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(AIRTEL_BASE_URL).hostname,
      path: '/merchant/v1/payments/collect',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload))
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve({
              provider: 'airtel_money',
              reference: parsed.data?.transaction || reference,
              transaction_id: parsed.data?.transaction,
              status: 'pending',
              message: 'Payment request sent. Please check your phone for PIN prompt.',
              raw: parsed
            });
          } else {
            reject(new Error(parsed.message || parsed.status?.message || 'Airtel Money payment request failed'));
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
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(AIRTEL_BASE_URL).hostname,
      path: `/merchant/v1/payments/${encodeURIComponent(reference)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const status = (parsed.data?.status || '').toLowerCase();
          resolve({
            verified: status === 'success' || status === 'completed',
            reference,
            status: parsed.data?.status,
            amount: parsed.data?.amount,
            currency: parsed.data?.currency,
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
