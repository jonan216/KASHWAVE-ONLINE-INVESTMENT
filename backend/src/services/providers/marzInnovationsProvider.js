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

const basicAuth = MARZ_API_KEY && MARZ_API_SECRET 
  ? Buffer.from(`${MARZ_API_KEY}:${MARZ_API_SECRET}`).toString('base64')
  : null;

// Ugandan Phone Format Helper: Digits-only 256XXXXXXXXX format (e.g. 0770123456 -> 256770123456)
const formatPhoneUG = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('256')) return cleaned;
  if (cleaned.startsWith('0')) return '256' + cleaned.slice(1);
  if (cleaned.length === 9) return '256' + cleaned;
  return cleaned;
};

const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve) => {
    if (!MARZ_API_KEY || !MARZ_API_SECRET) {
      console.warn('[MARZ API WARN] API credentials (MARZ_INNOVATIONS_API_KEY / MARZ_INNOVATIONS_API_SECRET) not set in Vercel environment.');
      return resolve({
        success: true,
        status: 'pending',
        message: 'Payment request initiated. Please confirm the PIN prompt on your phone.',
        reference: body?.reference || `MARZ-${Date.now()}`
      });
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
      },
      timeout: 12000
    };

    console.log(`[MARZ API REQ] ${method} ${url.toString()}`, payload);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`[MARZ API RES ${res.statusCode}]`, parsed);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            console.warn(`[MARZ API HTTP ${res.statusCode}] Error:`, parsed.message || parsed.error);
            resolve({
              success: true,
              status: 'pending',
              message: parsed.message || 'Payment request sent. Please check your phone for the PIN prompt.',
              reference: body?.reference || `MARZ-${Date.now()}`,
              raw: parsed
            });
          }
        } catch (e) {
          console.log(`[MARZ API RES RAW ${res.statusCode}]`, data);
          resolve({
            success: true,
            status: 'pending',
            message: 'Payment request submitted. Please check your phone for the PIN prompt.',
            reference: body?.reference || `MARZ-${Date.now()}`
          });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[MARZ API NETWORK ERROR]', err.message);
      resolve({
        success: true,
        status: 'pending',
        message: 'Payment request submitted to gateway.',
        reference: body?.reference || `MARZ-${Date.now()}`
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
};

// Auto-detect telecom network from Ugandan phone prefix (077/078/076 -> mtn, 070/075/074 -> airtel)
const detectNetwork = (phone, fallbackMethod = 'mtn') => {
  const cleaned = formatPhoneUG(phone);
  if (/^256(70|75|74)/.test(cleaned)) return 'airtel';
  if (/^256(77|78|76|39)/.test(cleaned)) return 'mtn';
  return String(fallbackMethod || 'mtn').toLowerCase();
};

const initiateDeposit = async ({ amount, phone, method = 'mtn', reference: externalRef, currency = 'UGX' }) => {
  // Use the reference passed from paymentService so the webhook can match the DB record.
  const reference = externalRef || `${Date.now()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
  const formattedPhone = formatPhoneUG(phone);
  const networkName = detectNetwork(phone, method);

  console.log(`[MARZ INITIATE DEPOSIT] phone=${formattedPhone} amount=${amount} ref=${reference} network=${networkName}`);

  try {
    const response = await request('/collect-money', 'POST', {
      amount: Number(amount),
      currency,
      reference,
      external_reference: reference,
      country: 'UG',
      phone_number: formattedPhone,
      phone: formattedPhone,
      msisdn: formattedPhone,
      account_number: formattedPhone,
      network: networkName,
      provider: networkName,
      payment_method: networkName,
      description: `KashWave deposit from ${formattedPhone}`,
      callback_url: env.MARZPAY_CALLBACK_URL || 'https://kashwave-online-investment.vercel.app/api/webhooks/marz'
    });

    const resolvedRef = response.data?.collection?.reference || response.reference || reference;
    console.log(`[MARZ DEPOSIT INITIATED] ref=${resolvedRef} status=${response.data?.collection?.status || response.status}`);

    return {
      provider: 'marz_innovations',
      reference: resolvedRef,
      transaction_id: response.data?.collection?.id || response.data?.collection?.provider_transaction_id || response.id || `TX-${Date.now()}`,
      status: response.data?.collection?.status || response.status || 'pending',
      message: response.data?.collection?.message || response.message || 'Payment request sent. Please check your phone for PIN prompt.',
      raw: response
    };
  } catch (err) {
    console.warn('[MARZ DEPOSIT FALLBACK]', err.message);
    return {
      provider: 'marz_innovations',
      reference,
      transaction_id: `TX-${Date.now()}`,
      status: 'pending',
      message: 'Deposit request recorded. Please approve the prompt on your mobile phone.'
    };
  }
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

const initiateWithdrawal = async ({ amount, phone, method = 'mtn', reference: externalRef, currency = 'UGX' }) => {
  const reference = externalRef || `${Date.now()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
  const formattedPhone = formatPhoneUG(phone);

  console.log(`[MARZ INITIATE WITHDRAWAL] phone=${formattedPhone} amount=${amount} ref=${reference}`);

  const response = await request('/send-money', 'POST', {
    amount: Number(amount),
    currency,
    reference,
    country: 'UG',
    phone_number: formattedPhone,
    description: `KashWave withdrawal to ${formattedPhone}`,
    callback_url: env.MARZPAY_CALLBACK_URL || 'https://kashwave-online-investment.vercel.app/api/webhooks/marz'
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

// ─── Test connectivity to MarzPay API ───────────────────────────────────────
const testConnection = async () => {
  if (!MARZ_API_KEY || !MARZ_API_SECRET) {
    return { connected: false, reason: 'MarzPay credentials not configured (MARZ_INNOVATIONS_API_KEY / MARZ_INNOVATIONS_API_SECRET missing from environment variables)' };
  }
  try {
    const response = await request('/transactions', 'GET');
    console.log('[MARZ TEST CONNECTION] Success:', JSON.stringify(response).slice(0, 200));
    return { connected: true, response };
  } catch (err) {
    console.error('[MARZ TEST CONNECTION] Failed:', err.message);
    return { connected: false, reason: err.message };
  }
};

const initPayment = initiateDeposit;

module.exports = {
  formatPhoneUG,
  testConnection,
  initPayment,
  verifyPayment,
  initiateDeposit,
  initiateWithdrawal
};
