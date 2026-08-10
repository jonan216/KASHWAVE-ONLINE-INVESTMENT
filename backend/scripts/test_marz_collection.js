const https = require('https');
const env = require('../src/config/env');

const MARZ_BASE_URL = env.MARZ_INNOVATIONS_BASE_URL || 'https://wallet.wearemarz.com/api/v1';
const MARZ_API_KEY = env.MARZ_INNOVATIONS_API_KEY || 'marz_a7ryunjjiI8BBS9K';
const MARZ_API_SECRET = env.MARZ_INNOVATIONS_API_SECRET || 'tOxsq85zmCQrDvXB6jUouNnxqQQlSHYS';

const basicAuth = Buffer.from(`${MARZ_API_KEY}:${MARZ_API_SECRET}`).toString('base64');

async function testMarzCollection() {
  console.log('Testing Marz Innovations Collection API...');
  console.log('Base URL:', MARZ_BASE_URL);
  console.log('API Key:', MARZ_API_KEY ? `${MARZ_API_KEY.slice(0, 8)}...` : 'MISSING');

  const testPayload = {
    amount: 1000,
    currency: 'UGX',
    reference: `TEST-${Date.now()}`,
    external_reference: `TEST-${Date.now()}`,
    country: 'UG',
    phone_number: '256770123456',
    phone: '256770123456',
    msisdn: '256770123456',
    account_number: '256770123456',
    network: 'MTN',
    provider: 'MTN',
    payment_method: 'MTN',
    description: 'Test KashWave Deposit',
    callback_url: 'https://kashwave-online-investment.vercel.app/api/webhooks/marz'
  };

  const payloadStr = JSON.stringify(testPayload);

  const url = new URL(`${MARZ_BASE_URL}/collect-money`);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': MARZ_API_KEY,
      'x-api-secret': MARZ_API_SECRET,
      'X-API-KEY': MARZ_API_KEY,
      'X-API-SECRET': MARZ_API_SECRET,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadStr)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('--- MARZ API RESPONSE START ---');
        console.log(`STATUS CODE: ${res.statusCode}`);
        console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
        console.log('BODY:', data);
        console.log('--- MARZ API RESPONSE END ---');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('[REQUEST ERROR]', err);
      resolve();
    });

    req.write(payloadStr);
    req.end();
  });
}

testMarzCollection();
