-- ==============================================================================
-- KASHWAVE FINTECH PLATFORM — MIGRATION 003: ADMIN USER DELETION CASCADE & RPC
-- Run this in Supabase Dashboard > SQL Editor or PostgreSQL Console
-- ==============================================================================

-- 1. Ensure ON DELETE CASCADE constraints on all user-dependent tables
ALTER TABLE IF EXISTS wallets 
  DROP CONSTRAINT IF EXISTS wallets_user_id_fkey,
  ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS investments 
  DROP CONSTRAINT IF EXISTS investments_user_id_fkey,
  ADD CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS deposits 
  DROP CONSTRAINT IF EXISTS deposits_user_id_fkey,
  ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS withdrawals 
  DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey,
  ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS transactions 
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey,
  ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS payment_transactions 
  DROP CONSTRAINT IF EXISTS payment_transactions_user_id_fkey,
  ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS referrals 
  DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey,
  DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey,
  ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS kyc_verification 
  DROP CONSTRAINT IF EXISTS kyc_verification_user_id_fkey,
  ADD CONSTRAINT kyc_verification_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS refresh_tokens 
  DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey,
  ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS csrf_tokens 
  DROP CONSTRAINT IF EXISTS csrf_tokens_user_id_fkey,
  ADD CONSTRAINT csrf_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. CREATE CASCADE PURGE STORED PROCEDURE (RPC) FOR SUPABASE / POSTGRESQL
CREATE OR REPLACE FUNCTION delete_user_cascade(target_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    DELETE FROM audit_logs WHERE user_id = target_user_id;
    DELETE FROM refresh_tokens WHERE user_id = target_user_id;
    DELETE FROM csrf_tokens WHERE user_id = target_user_id;
    DELETE FROM kyc_verification WHERE user_id = target_user_id;
    DELETE FROM payment_transactions WHERE user_id = target_user_id;
    DELETE FROM investments WHERE user_id = target_user_id;
    DELETE FROM transactions WHERE user_id = target_user_id;
    DELETE FROM deposits WHERE user_id = target_user_id;
    DELETE FROM withdrawals WHERE user_id = target_user_id;
    DELETE FROM notifications WHERE user_id = target_user_id;
    DELETE FROM referrals WHERE referrer_id = target_user_id OR referee_id = target_user_id;
    DELETE FROM wallets WHERE user_id = target_user_id;
    DELETE FROM users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
