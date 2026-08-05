const { Pool } = require('pg');
const env = require('./env');

let pool = null;
let isPostgresConnected = false;

// Hybrid database connector supporting live PostgreSQL & Zero-config Mock Store
if (env.DATABASE_URL || process.env.PGHOST) {
  try {
    pool = new Pool(
      env.DATABASE_URL
        ? { connectionString: env.DATABASE_URL, ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
        : {
            user: env.PGUSER,
            password: env.PGPASSWORD,
            host: env.PGHOST,
            port: env.PGPORT,
            database: env.PGDATABASE,
          }
    );

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL Pool Error:', err);
    });
  } catch (err) {
    console.warn('PostgreSQL initialization deferred or failed:', err.message);
  }
}

// In-Memory Database Store for Instant Local Demo Execution when PG is not present
const mockStore = {
  users: [],
  wallets: [],
  plans: [
    { id: 1, title: '10K Saving Plan', description: 'Fixed UGX 10,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 10000.00, max_investment: 10000.00, bonus_amount: 3000.00, salary_bonus: 10000.00, risk_level: 'low', status: 'active' },
    { id: 2, title: '20K Saving Plan', description: 'Fixed UGX 20,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 20000.00, max_investment: 20000.00, bonus_amount: 3000.00, salary_bonus: 10000.00, risk_level: 'low', status: 'active' },
    { id: 3, title: '50K Saving Plan', description: 'Fixed UGX 50,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 50000.00, max_investment: 50000.00, bonus_amount: 3000.00, salary_bonus: 15000.00, risk_level: 'medium', status: 'active' },
    { id: 4, title: '100K Saving Plan', description: 'Fixed UGX 100,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 100000.00, max_investment: 100000.00, bonus_amount: 3000.00, salary_bonus: 50000.00, risk_level: 'high', status: 'active' },
    { id: 5, title: '300K Saving Plan', description: 'Fixed UGX 300,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 300000.00, max_investment: 300000.00, bonus_amount: 3000.00, salary_bonus: 60000.00, risk_level: 'vip', status: 'active' }
  ],
  investments: [],
  transactions: [],
  refresh_tokens: [],
  kyc: []
};

async function testConnection() {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    client.release();
    isPostgresConnected = true;
    console.log('PostgreSQL Database Connected Successfully.');
    return true;
  } catch (err) {
    console.log('PostgreSQL connection check failed. Falling back to local Mock Store mode.');
    isPostgresConnected = false;
    return false;
  }
}

module.exports = {
  pool,
  mockStore,
  testConnection,
  isPostgresConnected: () => isPostgresConnected
};
