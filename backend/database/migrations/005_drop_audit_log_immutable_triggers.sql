-- ==============================================================================
-- KASHWAVE — MIGRATION 005: REMOVE IMMUTABLE TRIGGERS FROM audit_logs
-- Run this in your Supabase Dashboard > SQL Editor
-- This allows admin user deletion to update/clear audit_log user references
-- ==============================================================================

-- Drop the triggers that block UPDATE and DELETE on audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_immutable_update ON audit_logs;
DROP TRIGGER IF EXISTS trg_audit_logs_immutable_delete ON audit_logs;

-- Also drop the blocking function (safe to remove)
DROP FUNCTION IF EXISTS prevent_audit_modification();

-- Confirm triggers are gone
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'audit_logs';
