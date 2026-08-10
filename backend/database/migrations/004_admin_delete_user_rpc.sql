-- ==============================================================================
-- KASHWAVE — MIGRATION 004: ADMIN DELETE USER RPC
-- IMPORTANT: Run this SQL in your Supabase Dashboard > SQL Editor
-- This creates a safe stored procedure that deletes a user and all their data
-- in one atomic transaction, respecting the immutable audit_logs constraint.
-- ==============================================================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS admin_delete_user(integer);

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_referral_code TEXT;
BEGIN
  -- 1. Find user first
  SELECT id, email, full_name, role, referral_code
    INTO v_user
    FROM users
   WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  v_referral_code := v_user.referral_code;

  -- 2. Clear SET NULL foreign key references (where user was an admin/approver)
  UPDATE deposits SET approved_by_user_id = NULL WHERE approved_by_user_id = target_user_id;
  UPDATE withdrawals SET approved_by = NULL WHERE approved_by = target_user_id;
  UPDATE kyc_verification SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE roi_settings SET created_by = NULL WHERE created_by = target_user_id;

  -- 3. Clear referral chain references
  IF v_referral_code IS NOT NULL THEN
    UPDATE users SET referred_by_code = NULL WHERE referred_by_code = v_referral_code;
  END IF;

  -- 4. Delete dependent data (NOT audit_logs — they are immutable by trigger)
  DELETE FROM refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM password_reset_tokens WHERE user_id = target_user_id;
  DELETE FROM email_verification_tokens WHERE user_id = target_user_id;
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

  -- 5. Delete the user (audit_logs.user_id becomes NULL automatically via ON DELETE SET NULL)
  DELETE FROM users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted successfully',
    'deleted_user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'full_name', v_user.full_name
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant access so the backend (anon/service key) can call it
GRANT EXECUTE ON FUNCTION admin_delete_user(integer) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_user(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(integer) TO service_role;
