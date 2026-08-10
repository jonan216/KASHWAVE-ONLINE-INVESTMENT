-- ==============================================================================
-- KASHWAVE — MIGRATION 006: EXPAND PAYMENT TRANSACTIONS PROVIDER CHECK CONSTRAINT
-- Run this in your Supabase Dashboard > SQL Editor
-- Allows 'marz_innovations' and custom gateway providers in payment_transactions
-- ==============================================================================

-- Drop old check constraint if exists
ALTER TABLE IF EXISTS payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;

-- Add updated check constraint including 'marz_innovations' and 'card'
ALTER TABLE IF EXISTS payment_transactions
  ADD CONSTRAINT payment_transactions_provider_check
  CHECK (provider IN ('mtn_momo', 'airtel_money', 'visa', 'mastercard', 'bank_transfer', 'manual', 'usdt', 'marz_innovations', 'card'));
