const db = require('../src/config/db');

async function migrate() {
  try {
    await db.pool.query(`
      ALTER TABLE payment_transactions 
      DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;
    `);
    console.log('Dropped old constraint');

    await db.pool.query(`
      ALTER TABLE payment_transactions 
      ADD CONSTRAINT payment_transactions_provider_check 
      CHECK (provider IN ('mtn_momo', 'airtel_money', 'visa', 'mastercard', 'bank_transfer', 'manual', 'usdt', 'marz_innovations'));
    `);
    console.log('Added new constraint with marz_innovations');
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
