-- ==============================================================================
-- KASHWAVE FINTECH PLATFORM — INITIAL SEED DATA
-- Database Engine: PostgreSQL 14+
-- ==============================================================================

-- 1. Insert 5 Photo-based UGX Saving Plans
INSERT INTO investment_plans (id, title, description, daily_return_percent, duration_days, min_investment, max_investment, bonus_amount, salary_bonus, risk_level, status)
VALUES
  (1, '10K Saving Plan', 'Fixed UGX 10,000 micro saving plan with 5% daily return.', 5.00, 60, 10000.00, 10000.00, 3000.00, 10000.00, 'low', 'active'),
  (2, '20K Saving Plan', 'Fixed UGX 20,000 bronze saving plan with 5% daily return.', 5.00, 60, 20000.00, 20000.00, 3000.00, 10000.00, 'low', 'active'),
  (3, '50K Saving Plan', 'Fixed UGX 50,000 silver saving plan with 5% daily return.', 5.00, 60, 50000.00, 50000.00, 3000.00, 15000.00, 'medium', 'active'),
  (4, '100K Saving Plan', 'Fixed UGX 100,000 gold saving plan with 5% daily return.', 5.00, 60, 100000.00, 100000.00, 3000.00, 50000.00, 'high', 'active'),
  (5, '300K Saving Plan', 'Fixed UGX 300,000 diamond saving plan with 5% daily return.', 5.00, 60, 300000.00, 300000.00, 3000.00, 60000.00, 'vip', 'active')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  daily_return_percent = EXCLUDED.daily_return_percent,
  duration_days = EXCLUDED.duration_days,
  min_investment = EXCLUDED.min_investment,
  max_investment = EXCLUDED.max_investment,
  bonus_amount = EXCLUDED.bonus_amount,
  salary_bonus = EXCLUDED.salary_bonus;

-- 2. Insert Super Admin User (Password: admin123)
INSERT INTO users (full_name, email, password_hash, role, status, referral_code, is_email_verified)
VALUES
  ('KashWave Super Admin', 'admin@kashwave.com', '$2b$10$w8T0hX4e8q4l1T8w2X6v1e9k0l1T8w2X6v1e9k0l1T8w2X6v1e9k0', 'admin', 'active', 'KASHADMIN001', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 3. Create Admin Wallet
INSERT INTO wallets (user_id, main_balance, investment_balance, total_earnings, currency)
SELECT id, 10000000.00, 0.00, 0.00, 'UGX'
FROM users WHERE email = 'admin@kashwave.com'
ON CONFLICT (user_id) DO NOTHING;
