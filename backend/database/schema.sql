-- ==============================================================================
-- KASHWAVE FINTECH PLATFORM — PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Author: KashWave Core Engineering
-- Database Engine: PostgreSQL 14+
-- Features: Foreign Keys, Indexes, Check Constraints, Triggers & DDL Statements
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores investor identity, credentials, role, status, and referral codes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(30) DEFAULT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
    referral_code VARCHAR(30) UNIQUE NOT NULL,
    referred_by_code VARCHAR(30) DEFAULT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255) DEFAULT NULL,
    has_received_welcome_bonus BOOLEAN DEFAULT FALSE,
    has_received_referral_bonus BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. WALLET TABLE
-- One-to-One mapping per user tracking UGX & USD equivalent balances
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    main_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (main_balance >= 0),
    investment_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (investment_balance >= 0),
    total_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_earnings >= 0),
    total_deposited NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0),
    total_withdrawn NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. INVESTMENT PLANS TABLE
-- Standardized investment packages (Starter, Bronze, Silver, Gold, Diamond)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    daily_return_percent NUMERIC(5, 2) NOT NULL CHECK (daily_return_percent > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    min_investment NUMERIC(15, 2) NOT NULL CHECK (min_investment > 0),
    max_investment NUMERIC(15, 2) NOT NULL CHECK (max_investment >= min_investment),
    bonus_amount NUMERIC(15, 2) DEFAULT 0.00 CHECK (bonus_amount >= 0),
    salary_bonus NUMERIC(15, 2) DEFAULT 0.00 CHECK (salary_bonus >= 0),
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'vip')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. INVESTMENTS TABLE (Active user contracts)
-- Capital locking for 60 days with Mon-Fri automated 5% payouts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES investment_plans(id) ON DELETE RESTRICT,
    invested_amount NUMERIC(15, 2) NOT NULL CHECK (invested_amount > 0),
    expected_return NUMERIC(15, 2) NOT NULL CHECK (expected_return >= invested_amount),
    accrued_earnings NUMERIC(15, 2) DEFAULT 0.00 CHECK (accrued_earnings >= 0),
    daily_roi_rate NUMERIC(5, 2) DEFAULT 5.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    capital_locked BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    last_payout_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. DEPOSITS TABLE
-- User funding requests via MTN MoMo, Airtel Money, Visa, MasterCard, Bank Transfer
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    reference_code VARCHAR(60) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    payment_method VARCHAR(50) NOT NULL, -- 'MTN Mobile Money', 'Airtel Money', 'Visa Card', 'MasterCard', 'Bank Transfer'
    proof_reference VARCHAR(255) DEFAULT NULL, -- Mobile Money Transaction ID or Auth Code
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 6. WITHDRAWALS TABLE
-- Friday-only payout requests to Mobile Money or Bank Accounts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    reference_code VARCHAR(60) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    payment_method VARCHAR(50) NOT NULL, -- 'MTN Mobile Money', 'Airtel Money', 'Bank Transfer'
    destination_details TEXT NOT NULL, -- Mobile number or Bank account number + name
    fee NUMERIC(15, 2) DEFAULT 0.00 CHECK (fee >= 0),
    net_payout NUMERIC(15, 2) NOT NULL CHECK (net_payout > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. TRANSACTIONS TABLE (Unified Financial Audit Ledger)
-- Consolidates all deposits, withdrawals, plan investments, ROI payouts & referral bonuses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    reference_code VARCHAR(60) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'investment', 'roi_payout', 'referral_bonus', 'welcome_bonus')),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    fee NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    payment_method VARCHAR(50) DEFAULT 'USSD Mobile Money',
    wallet_address TEXT,
    proof_reference VARCHAR(255),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. REFERRAL TABLE
-- 3-Level Referral Commission Structure (Level 1: 4%, Level 2: 3%, Level 3: 2%)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
    commission_rate NUMERIC(5, 2) NOT NULL CHECK (commission_rate > 0),
    earned_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (earned_amount >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- Real-time investor alert notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'transaction', 'roi')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS TABLE
-- Security & Administrative Access Audit Trail
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ==============================================================================
-- TABLE: payment_transactions
-- Secure webhook-verified payment event ledger
-- Never trust frontend — only webhook-confirmed entries update wallet
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_ref ON payment_transactions(reference_number);

CREATE TRIGGER trg_update_payment_tx_timestamp
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- SEED DATA: Investment Plans
-- ==============================================================================
INSERT INTO investment_plans (title, description, daily_return_percent, duration_days, min_investment, max_investment, bonus_amount, salary_bonus, risk_level, status, currency)
VALUES
  ('10K Saving Plan', 'Fixed UGX 10,000 saving lock with 5% daily yield.', 5.00, 60, 10000.00, 10000.00, 3000.00, 10000.00, 'low', 'active', 'UGX'),
  ('20K Saving Plan', 'Fixed UGX 20,000 saving lock with 5% daily yield.', 5.00, 60, 20000.00, 20000.00, 3000.00, 10000.00, 'low', 'active', 'UGX'),
  ('50K Saving Plan', 'Fixed UGX 50,000 saving lock with 5% daily yield.', 5.00, 60, 50000.00, 50000.00, 3000.00, 15000.00, 'medium', 'active', 'UGX'),
  ('100K Saving Plan', 'Fixed UGX 100,000 saving lock with 5% daily yield.', 5.00, 60, 100000.00, 100000.00, 3000.00, 50000.00, 'high', 'active', 'UGX'),
  ('300K Saving Plan', 'Fixed UGX 300,000 saving lock with 5% daily yield.', 5.00, 60, 300000.00, 300000.00, 3000.00, 60000.00, 'vip', 'active', 'UGX')
ON CONFLICT (title) DO NOTHING;

-- ==============================================================================
-- AUTOMATED TRIGGER FUNCTIONS (For balance sync & timestamp updates)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_update_wallets_timestamp
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
