const db = require('../src/config/db');

async function migrate() {
  try {
    if (isPostgresConnected()) {
      await db.pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS has_received_referral_bonus BOOLEAN DEFAULT FALSE;
      `);
      console.log('Added has_received_referral_bonus column to users table');
    } else {
      console.log('Database not connected, skipping migration');
    }
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

function isPostgresConnected() {
  return db.isPostgresConnected();
}

migrate();
