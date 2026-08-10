/**
 * Marz Innovations — Primary Payment Provider
 * Docs: https://wallet.wearemarz.com/documentation
 * Base URL: https://wallet.wearemarz.com/api/v1
 */
const https = require('https');
const { URL } = require('url');
const env = require('../../config/env');

const MARZ_BASE_URL = env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1';
const MARZ_API_KEY = env.MARZ_INNOVATIONS_API_KEY;
const MARZ_API_SECRET = env.MARZ_INNOVATIONS_API_SECRET;

const basicAuth = Buffer.from(`${MARZ_API_KEY}:${MARZ_API_SECRET}`).toString('base64');

const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    if (!MARZ_API_KEY || !MARZ_API_SECRET) {
      return reject(new Error('Marz Innovations API credentials not configured'));
    }

    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(`${MARZ_BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || parsed.error || `Marz API error ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response from Marz API: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const initiateDeposit = async ({ amount, phone, method = 'mtn' }) => {
  const reference = `${Date.now()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

  const response = await request('/collect-money', 'POST', {
    amount: { formatted: Number(amount).toLocaleString(), raw: Number(amount), currency: 'UGX' },
    reference,
    country: 'UG',
    phone_number: phone,
    description: `KashWave deposit from ${phone}`,
    callback_url: `${env.CLIENT_ORIGIN || 'https://kashwave-online-investment.vercel.app'}/api/webhooks/marz`
  });

  return {
    provider: 'marz_innovations',
    reference: response.data?.collection?.reference || response.reference || reference,
    transaction_id: response.data?.collection?.id || response.data?.collection?.provider_transaction_id || response.id,
    status: response.data?.collection?.status || response.status || 'pending',
    message: response.data?.collection?.message || response.message || 'Payment request sent. Please check your phone for PIN prompt.',
    raw: response
  };
};

const verifyPayment = async (reference) => {
  try {
    const response = await request(`/collect-money/${encodeURIComponent(reference)}`, 'GET');
    const collection = response.data?.collection || response;
    const status = (collection.status || '').toLowerCase();
    return {
      verified: status === 'success' || status === 'completed' || status === 'paid',
      reference,
      status: collection.status,
      amount: collection.amount?.raw || collection.amount,
      currency: collection.amount?.currency || 'UGX',
      transaction_id: collection.id || collection.provider_transaction_id,
      raw: response
    };
  } catch (err) {
    console.error('[MARZ] verifyPayment error:', err.message);
    return { verified: false, reference, reason: err.message };
  }
};

const initiateWithdrawal = async ({ amount, phone, method = 'mtn' }) => {
  const reference = `${Date.now()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

  const response = await request('/send-money', 'POST', {
    amount: { formatted: Number(amount).toLocaleString(), raw: Number(amount), currency: 'UGX' },
    reference,
    country: 'UG',
    phone_number: phone,
    description: `KashWave withdrawal to ${phone}`,
    callback_url: `${env.CLIENT_ORIGIN || 'https://kashwave-online-investment.vercel.app'}/api/webhooks/marz`
  });

  return {
    provider: 'marz_innovations',
    reference: response.data?.withdrawal?.reference || response.reference || reference,
    transaction_id: response.data?.withdrawal?.id || response.data?.withdrawal?.provider_transaction_id || response.id,
    status: response.data?.withdrawal?.status || response.status || 'pending',
    message: response.data?.withdrawal?.message || response.message || 'Withdrawal initiated. Processing...',
    raw: response
  };
};

const initPayment = initiateDeposit;

module.exports = {
  initPayment,
  verifyPayment,
  initiateDeposit,
  initiateWithdrawal
};
