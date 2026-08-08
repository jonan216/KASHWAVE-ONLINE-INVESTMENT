const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:kashwavecom%402026@db.fcbangmeuhvfojiyxdug.supabase.co:5432/postgres';

async function fixDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    const client = await pool.connect();
    console.log('Connected successfully!');

    // Drop and recreate exec_sql function
    console.log('\n[1/3] Fixing exec_sql function...');
    await client.query('DROP FUNCTION IF EXISTS exec_sql(text);');
    await client.query(`
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $$
      DECLARE
        result_rows jsonb := '[]'::jsonb;
        rows_affected integer := 0;
        rec record;
        sql_trimmed text;
      BEGIN
        sql_trimmed := trim(lower(sql));
        
        IF sql_trimmed LIKE 'select%' OR sql_trimmed LIKE 'with%' OR sql_trimmed LIKE '%returning%' THEN
          FOR rec IN EXECUTE sql LOOP
            result_rows := result_rows || (row_to_json(rec)::jsonb);
          END LOOP;
          GET DIAGNOSTICS rows_affected = ROW_COUNT;
          RETURN jsonb_build_object('rows', result_rows, 'rows_affected', rows_affected);
        ELSE
          EXECUTE sql;
          GET DIAGNOSTICS rows_affected = ROW_COUNT;
          RETURN jsonb_build_object('rows_affected', rows_affected);
        END IF;
        
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object('error', SQLERRM);
      END;
      $$;
    `);
    await client.query('GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;');
    await client.query('GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;');
    console.log('  ✅ exec_sql function fixed');

    // Add welcome bonus column
    console.log('\n[2/3] Adding welcome bonus column...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_welcome_bonus BOOLEAN DEFAULT FALSE;');
    console.log('  ✅ has_received_welcome_bonus column added');

    // Add payment_transactions table if missing
    console.log('\n[3/3] Adding payment_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL DEFAULT 'manual'
              CHECK (provider IN ('mtn_momo', 'airtel_money', 'visa', 'mastercard', 'bank_transfer', 'manual', 'marz_innovations')),
          reference_number VARCHAR(255) UNIQUE NOT NULL,
          internal_reference VARCHAR(60) UNIQUE NOT NULL,
          amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
          currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
          direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
          status VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'webhook_received', 'verified', 'credited', 'failed', 'rejected')),
          webhook_payload JSONB DEFAULT NULL,
          webhook_signature VARCHAR(500) DEFAULT NULL,
          signature_verified BOOLEAN DEFAULT FALSE,
          wallet_credited BOOLEAN DEFAULT FALSE,
          failure_reason TEXT DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_tx_ref ON payment_transactions(reference_number);');
    console.log('  ✅ payment_transactions table created');

    client.release();
    console.log('\n✅ All database fixes applied successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();
