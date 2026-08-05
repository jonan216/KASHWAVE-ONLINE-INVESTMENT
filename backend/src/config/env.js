const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function requireSecret(name, value) {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`FATAL: Missing required environment variable ${name}. Application will not start.`);
    }
    console.warn(`[CONFIG] WARNING: ${name} is not set. Using ephemeral random secret for development only.`);
    return require('crypto').randomBytes(64).toString('hex');
  }
  return value;
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: requireSecret('JWT_SECRET', process.env.JWT_SECRET),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_SECRET: requireSecret('REFRESH_SECRET', process.env.REFRESH_SECRET),
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || 'postgres',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPORT: process.env.PGPORT || 5432,
  PGDATABASE: process.env.PGDATABASE || 'kashwave_db',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*',
  EMAIL_HOST: process.env.EMAIL_HOST || null,
  EMAIL_PORT: process.env.EMAIL_PORT || '587',
  EMAIL_USER: process.env.EMAIL_USER || null,
  EMAIL_PASS: process.env.EMAIL_PASS || null,
  PAYMENT_WEBHOOK_SECRET: requireSecret('PAYMENT_WEBHOOK_SECRET', process.env.PAYMENT_WEBHOOK_SECRET),
  PAYMENT_PROVIDER_NAME: process.env.PAYMENT_PROVIDER_NAME || 'Marz Innovations',
  PAYMENT_PROVIDER_EMAIL: process.env.PAYMENT_PROVIDER_EMAIL || null,
  PAYMENT_PROVIDER_PHONE: process.env.PAYMENT_PROVIDER_PHONE || null,
  MTN_MOMO_API_KEY: process.env.MTN_MOMO_API_KEY || null,
  MTN_MOMO_SUBSCRIPTION_KEY: process.env.MTN_MOMO_SUBSCRIPTION_KEY || null,
  AIRTEL_CLIENT_ID: process.env.AIRTEL_MONEY_CLIENT_ID || null,
  AIRTEL_CLIENT_SECRET: process.env.AIRTEL_MONEY_CLIENT_SECRET || null,
};

