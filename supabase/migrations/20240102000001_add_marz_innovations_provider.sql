-- =============================================================================
-- MIGRATION: Add marz_innovations to payment_transactions provider CHECK constraint
-- Run this in Supabase SQL Editor to fix Marz payment tracking
-- =============================================================================

-- Step 1: Drop the existing provider check constraint
ALTER TABLE payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;

-- Step 2: Re-add the constraint including marz_innovations
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_provider_check
  CHECK (provider IN (
    'mtn_momo',
    'airtel_money',
    'visa',
    'mastercard',
    'bank_transfer',
    'manual',
    'usdt',
    'marz_innovations'
  ));
