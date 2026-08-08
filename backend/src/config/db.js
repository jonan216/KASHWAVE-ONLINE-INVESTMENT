const { Pool } = require('pg');
const env = require('./env');
const https = require('https');

let pool = null;
let isPostgresConnected = false;

// --- HTTP-based Pool (for serverless environments that can't reach PostgreSQL directly) ---
function escapeSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`;
  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ').replace('Z', '+00:00')}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function substituteParams(sql, params) {
  if (!params || params.length === 0) return sql;
  let result = sql;
  for (let i = 0; i < params.length; i++) {
    const placeholder = new RegExp('\\$' + (i + 1) + '\\b');
    const replacement = escapeSqlValue(params[i]);
    let match;
    while ((match = placeholder.exec(result)) !== null) {
      result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
      placeholder.lastIndex = match.index + replacement.length;
    }
  }
  return result;
}

class HttpPool {
  constructor(supabaseUrl, supabaseKey) {
    this.url = supabaseUrl;
    this.key = supabaseKey;
  }

  async query(text, params) {
    const sql = substituteParams(text, params || []);
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ sql });
      const url = new URL(`${this.url}/rest/v1/rpc/exec_sql`);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const unwrapped = parsed && parsed.exec_sql !== undefined ? parsed.exec_sql : parsed;
            if (unwrapped && unwrapped.error) {
              const err = new Error(unwrapped.error);
              reject(err);
            } else if (unwrapped && typeof unwrapped === 'object' && Array.isArray(unwrapped.rows)) {
              resolve({ rows: unwrapped.rows, rowCount: unwrapped.rows_affected || unwrapped.rows.length });
            } else if (Array.isArray(unwrapped)) {
              resolve({ rows: unwrapped, rowCount: unwrapped.length });
            } else if (unwrapped && typeof unwrapped === 'object' && unwrapped.rows_affected !== undefined) {
              resolve({ rows: [], rowCount: unwrapped.rows_affected });
            } else {
              resolve({ rows: [], rowCount: 0 });
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async connect() {
    return {
      query: (text, params) => this.query(text, params),
      release: () => {},
      releaseError: () => {}
    };
  }

  end() {}
  on() {}
}

// --- Database initialization ---
if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  console.log('[DB] Using Supabase HTTP API mode (IPv4 compatible)');
  pool = new HttpPool(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  isPostgresConnected = true;
} else if (env.DATABASE_URL || process.env.PGHOST) {
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
            ssl: env.NODE_ENV === 'production' || env.PGHOST?.includes('supabase') ? { rejectUnauthorized: false } : false,
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
    { id: 1, title: '10K Saving Plan', description: 'Fixed UGX 10,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 10000.00, max_investment: 13000.00, bonus_amount: 3000.00, salary_bonus: 10000.00, risk_level: 'low', status: 'active' },
    { id: 2, title: '20K Saving Plan', description: 'Fixed UGX 20,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 20000.00, max_investment: 23000.00, bonus_amount: 3000.00, salary_bonus: 10000.00, risk_level: 'low', status: 'active' },
    { id: 3, title: '50K Saving Plan', description: 'Fixed UGX 50,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 50000.00, max_investment: 53000.00, bonus_amount: 3000.00, salary_bonus: 15000.00, risk_level: 'medium', status: 'active' },
    { id: 4, title: '100K Saving Plan', description: 'Fixed UGX 100,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 100000.00, max_investment: 103000.00, bonus_amount: 3000.00, salary_bonus: 50000.00, risk_level: 'high', status: 'active' },
    { id: 5, title: '300K Saving Plan', description: 'Fixed UGX 300,000 saving lock with 5% daily yield.', daily_return_percent: 5.0, duration_days: 60, min_investment: 300000.00, max_investment: 303000.00, bonus_amount: 3000.00, salary_bonus: 60000.00, risk_level: 'vip', status: 'active' }
  ],
  investments: [],
  transactions: [],
  refresh_tokens: [],
  kyc: []
};

async function testConnection() {
  if (!pool) return false;
  if (pool.constructor.name === 'HttpPool') {
    isPostgresConnected = true;
    console.log('[DB] HTTP API mode active (no TCP test needed).');
    return true;
  }
  try {
    const result = await pool.query('SELECT 1 as alive');
    isPostgresConnected = true;
    console.log('Database connection successful...');
    return true;
  } catch (err) {
    console.log('Database connection check failed. Falling back to local Mock Store mode.');
    console.log('  Error:', err.message);
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
