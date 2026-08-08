const db = require('../src/config/db');

async function migrate() {
  try {
    if (db.isPostgresConnected()) {
      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          email VARCHAR(255),
          user_id INTEGER,
          ip_address VARCHAR(45),
          user_agent TEXT,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);
        CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
      `);
      console.log('Created security_events table');

      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS csrf_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(128) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON csrf_tokens(user_id);
      `);
      console.log('Created csrf_tokens table');
    } else {
      console.log('Database not connected, skipping migration');
    }
    console.log('Security tables migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
