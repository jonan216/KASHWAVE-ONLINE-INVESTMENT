/**
 * SMS Service — Africa's Talking + Twilio fallback
 * Sends deposit PIN/confirmation messages to users' phones.
 */
const https = require('https');
const env = require('../config/env');

const AT_USERNAME = env.AT_USERNAME || null;
const AT_API_KEY = env.AT_API_KEY || null;
const TWILIO_SID = env.TWILIO_SID || null;
const TWILIO_TOKEN = env.TWILIO_TOKEN || null;
const TWILIO_FROM = env.TWILIO_FROM || null;
const DEFAULT_FROM = env.SMS_FROM || 'KashWave';

async function sendSMS({ to, message }) {
  if (!to || !message) return { success: false, provider: null, error: 'Missing phone or message' };

  if (AT_USERNAME && AT_API_KEY) {
    try {
      return await sendViaAfricaTalking(to, message);
    } catch (err) {
      console.error('[SMS] Africa\'s Talking error:', err.message);
      if (TWILIO_SID && TWILIO_TOKEN) {
        try {
          return await sendViaTwilio(to, message);
        } catch (err2) {
          console.error('[SMS] Twilio error:', err2.message);
          return { success: false, provider: null, error: err2.message };
        }
      }
      return { success: false, provider: null, error: err.message };
    }
  }

  if (TWILIO_SID && TWILIO_TOKEN) {
    try {
      return await sendViaTwilio(to, message);
    } catch (err) {
      console.error('[SMS] Twilio error:', err.message);
      return { success: false, provider: null, error: err.message };
    }
  }

  console.warn('[SMS] No SMS provider configured. Message:', message);
  return { success: false, provider: null, error: 'No SMS provider configured', message };
}

async function sendViaAfricaTalking(to, message) {
  const cleanedPhone = (to || '').replace(/[^0-9]/g, '');
  const formData = new URLSearchParams({
    username: AT_USERNAME,
    to: cleanedPhone,
    message: `${DEFAULT_FROM}: ${message}`
  });

  const auth = Buffer.from(`${AT_USERNAME}:${AT_API_KEY}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.africastalking.com',
      path: '/version1/messaging',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData.toString()),
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.SMSMessageData && parsed.SMSMessageData.Recipients) {
            const status = parsed.SMSMessageData.Recipients[0]?.status || 'Unknown';
            const success = status === 'Success' || status === 'Sent';
            resolve({ success, provider: 'africa_talking', status, raw: parsed });
          } else if (parsed.SMSMessageData && parsed.SMSMessageData.message === 'Sent') {
            resolve({ success: true, provider: 'africa_talking', status: 'Sent', raw: parsed });
          } else {
            resolve({ success: false, provider: 'africa_talking', status: parsed.status, raw: parsed, error: parsed.SMSMessageData?.message || parsed.errorMessage || parsed.message || 'Unknown response' });
          }
        } catch (e) {
          resolve({ success: false, provider: 'africa_talking', error: 'Invalid JSON response', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(formData.toString());
    req.end();
  });
}

async function sendViaTwilio(to, message) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const payload = new URLSearchParams({
    To: formatPhoneNumber(to),
    From: TWILIO_FROM,
    Body: message
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload.toString())
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.sid) {
            resolve({ success: true, provider: 'twilio', status: parsed.status, messageSid: parsed.sid, raw: parsed });
          } else {
            resolve({ success: false, provider: 'twilio', status: parsed.status, error: parsed.message || 'Twilio error', raw: parsed });
          }
        } catch (e) {
          resolve({ success: false, provider: 'twilio', error: 'Invalid JSON response', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload.toString());
    req.end();
  });
}

function formatPhoneNumber(phone) {
  if (!phone) return phone;
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('256')) return cleaned;
  if (cleaned.startsWith('0')) return `256${cleaned.substring(1)}`;
  return cleaned;
}

module.exports = { sendSMS, sendViaAfricaTalking, sendViaTwilio };
