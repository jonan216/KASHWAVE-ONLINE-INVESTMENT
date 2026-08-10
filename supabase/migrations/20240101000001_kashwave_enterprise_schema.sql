-- ==============================================================================
-- KASHWAVE ENTERPRISE SCHEMA MIGRATION 001
-- Extends base schema with: ROI Engine, KYC, Payment Webhooks, Audit enhancements
-- Run AFTER schema.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- TABLE: roi_settings
-- Admin-controlled dynamic ROI rules per investment plan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roi_settings (
    id SERIAL PRIMARY KEY,
    investment_plan_id INTEGER NOT NULL REFERENCES investment_plans(id) ON DELETE CASCADE,
    profit_percentage NUMERIC(6, 3) NOT NULL CHECK (profit_percentage > 0),
    calculation_type VARCHAR(20) NOT NULL DEFAULT 'daily'
        CHECK (calculation_type IN ('daily', 'weekly', 'monthly', 'fixed_maturity')),
    duration INTEGER NOT NULL DEFAULT 60 CHECK (duration > 0), -- days for this rule
    active_status BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roi_settings_plan ON roi_settings(investment_plan_id);
CREATE INDEX IF NOT EXISTS idx_roi_settings_active ON roi_settings(active_status);

-- Extend investment_plans with new enterprise fields
ALTER TABLE investment_plans
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'UGX'
        CHECK (currency IN ('UGX', 'USD')),
    ADD COLUMN IF NOT EXISTS benefits TEXT,
    ADD COLUMN IF NOT EXISTS risk_description TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Trigger for roi_settings timestamp updates
CREATE TRIGGER trg_update_roi_settings_timestamp
BEFORE UPDATE ON roi_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_update_investment_plans_timestamp
BEFORE UPDATE ON investment_plans
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ------------------------------------------------------------------------------
-- TABLE: kyc_verification
-- Know Your Customer identity check before withdrawals are enabled
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kyc_verification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    national_id_number VARCHAR(50) DEFAULT NULL,
    document_type VARCHAR(30) NOT NULL DEFAULT 'national_id'
        CHECK (document_type IN ('national_id', 'passport', 'driving_permit')),
    document_front_path VARCHAR(500) DEFAULT NULL,  -- secure server path, never public URL
    document_back_path VARCHAR(500) DEFAULT NULL,
    selfie_photo_path VARCHAR(500) DEFAULT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted'
        CHECK (verification_status IN (
            'not_submitted', 'pending', 'under_review', 'approved', 'rejected', 'resubmission_required'
        )),
    admin_comment TEXT DEFAULT NULL,
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verification(verification_status);

CREATE TRIGGER trg_update_kyc_timestamp
BEFORE UPDATE ON kyc_verification
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Add kyc_status column to users for quick access checks
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'not_submitted'
        CHECK (kyc_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'resubmission_required'));

-- ------------------------------------------------------------------------------
-- TABLE: payment_transactions
-- Secure webhook-verified payment event ledger
-- Never trust frontend — only webhook-confirmed entries update wallet
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual'
        CHECK (provider IN ('mtn_momo', 'airtel_money', 'visa', 'mastercard', 'bank_transfer', 'manual', 'usdt', 'marz_innovations')),
    reference_number VARCHAR(255) UNIQUE NOT NULL,
    internal_reference VARCHAR(60) UNIQUE NOT NULL, -- KashWave reference code
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'webhook_received', 'verified', 'credited', 'failed', 'rejected')),
    webhook_payload JSONB DEFAULT NULL,    -- raw provider payload stored for audit
    webhook_signature VARCHAR(500) DEFAULT NULL,
    signature_verified BOOLEAN DEFAULT FALSE,
    wallet_credited BOOLEAN DEFAULT FALSE, -- true only after balance updated
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

-- ------------------------------------------------------------------------------
-- Enhance audit_logs table with richer fields for regulatory compliance
-- ------------------------------------------------------------------------------
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS device_information TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT NULL,  -- 'user', 'wallet', 'investment', etc.
    ADD COLUMN IF NOT EXISTS resource_id INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS old_value JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS new_value JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info', 'warning', 'critical'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Audit logs are IMMUTABLE — prevent UPDATE or DELETE via trigger
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Modification not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER trg_audit_logs_immutable_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ------------------------------------------------------------------------------
-- Add withdrawal approval tracking fields
-- ------------------------------------------------------------------------------
ALTER TABLE withdrawals
    ADD COLUMN IF NOT EXISTS approval_type VARCHAR(20) DEFAULT 'manual'
        CHECK (approval_type IN ('auto', 'manual')),
    ADD COLUMN IF NOT EXISTS under_review_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kyc_verified_at_request BOOLEAN DEFAULT FALSE;

-- Seed ROI settings for all 5 existing plans
INSERT INTO roi_settings (investment_plan_id, profit_percentage, calculation_type, duration, active_status)
VALUES
  (1, 5.000, 'daily', 60, TRUE),
  (2, 5.000, 'daily', 60, TRUE),
  (3, 5.000, 'daily', 60, TRUE),
  (4, 5.000, 'daily', 60, TRUE),
  (5, 5.000, 'daily', 60, TRUE)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- TABLE: refresh_tokens
-- Refresh token rotation ledger — hashed tokens for secure storage
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Auto-purge expired tokens
CREATE OR REPLACE FUNCTION purge_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- TABLE: password_reset_tokens
-- Secure password reset flow with expiry
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens(token_hash);
