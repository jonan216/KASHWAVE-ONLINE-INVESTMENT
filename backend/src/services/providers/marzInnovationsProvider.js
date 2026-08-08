/**
 * MarzPay — Collections & Disbursements Provider
 * Official API guide: https://wallet.wearemarz.com/documentation
 * Base URL: https://wallet.wearemarz.com/api/v1
 * Auth: HTTP Basic Auth (API key:secret)
 */
const https = require('https');
const crypto = require('crypto');
const env = require('../../config/env');

const MARZ_BASE_URL = env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1';
const MARZ_API_KEY = env.MARZ_INNOVATIONS_API_KEY;
const MARZ_API_SECRET = env.MARZ_INNOVATIONS_API_SECRET;

function formatPhoneToE164(phone) {
  if (!phone) return phone;
  const cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('256')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+256${cleaned.substring(1)}`;
  if (!cleaned.startsWith('+')) return `+${cleaned}`;
  return phone;
}

function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = crypto.randomBytes(1)[0] % 16;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getAuthHeader() {
  if (!MARZ_API_KEY || !MARZ_API_SECRET) {
    throw new Error('MarzPay API credentials not configured');
  }
  return `Basic ${Buffer.from(`${MARZ_API_KEY}:${MARZ_API_SECRET}`).toString('base64')}`;
}

function marzRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(`${MARZ_BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
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
            reject(new Error(parsed.message || parsed.error || `MarzPay API error ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response from MarzPay API: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const initPayment = async ({ amount, currency = 'UGX', reference, phone, method = 'mtn' }) => {
  try {
    const uuidReference = reference || generateUUID();
    const normalizedPhone = formatPhoneToE164(phone);
    const response = await marzRequest('/collect-money', 'POST', {
      amount: Number(amount),
      phone_number: normalizedPhone,
      reference: uuidReference,
      country: 'UG',
      description: `KashWave deposit - ${formatCurrency(amount)}`,
      callback_url: env.MARZPAY_CALLBACK_URL || `${env.CLIENT_ORIGIN}/api/webhooks/marz`
    });

    return {
      provider: 'marz_innovations',
      reference: response.data?.transaction?.reference || uuidReference,
      transaction_id: response.data?.transaction?.uuid || response.data?.transaction?.id,
      status: response.data?.transaction?.status || 'pending',
      message: response.message || 'Payment request sent. Please check your phone for PIN prompt.',
      raw: response
    };
  } catch (err) {
    console.error('[MARZ] initPayment error:', err.message);
    return {
      provider: 'marz_innovations',
      reference: reference || generateUUID(),
      status: 'pending',
      message: 'Payment request sent. Please check your phone for PIN prompt.',
      raw: { error: err.message }
    };
  }
};

const verifyPayment = async (reference) => {
  try {
    const response = await marzRequest(`/collect-money/${encodeURIComponent(reference)}`, 'GET');
    const status = (response.data?.transaction?.status || '').toLowerCase();
    return {
      verified: status === 'completed' || status === 'successful',
      reference,
      status: response.data?.transaction?.status,
      amount: response.data?.collection?.amount?.raw,
      currency: response.data?.collection?.amount?.currency,
      transaction_id: response.data?.transaction?.uuid,
      raw: response
    };
  } catch (err) {
    console.error('[MARZ] verifyPayment error:', err.message);
    return { verified: false, reference, reason: err.message };
  }
};

const initiateDeposit = async ({ amount, phone, method = 'mtn' }) => {
  const reference = generateUUID();
  return initPayment({ amount, currency: 'UGX', reference, phone, method });
};

const initiateWithdrawal = async ({ amount, phone, method = 'mtn' }) => {
  const reference = generateUUID();
  try {
    const response = await marzRequest('/send-money', 'POST', {
      amount: Number(amount),
      phone_number: phone,
      reference,
      country: 'UG',
      description: `KashWave withdrawal - ${formatCurrency(amount)}`
    });

    return {
      provider: 'marz_innovations',
      reference: response.data?.transaction?.provider_reference || reference,
      transaction_id: response.data?.transaction?.uuid,
      status: response.data?.transaction?.status || 'pending',
      message: response.message || 'Withdrawal initiated. Processing...',
      raw: response
    };
  } catch (err) {
    console.error('[MARZ] initiateWithdrawal error:', err.message);
    throw err;
  }
};

function formatCurrency(amount) {
  return `UGX ${Number(amount).toLocaleString()}`;
}

module.exports = {
  initPayment,
  verifyPayment,
  initiateDeposit,
  initiateWithdrawal
};
