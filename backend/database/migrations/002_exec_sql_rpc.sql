-- Fix: Drop existing exec_sql and recreate with correct signature
DROP FUNCTION IF EXISTS exec_sql(text);

-- Create exec_sql RPC function for Supabase HTTP API mode
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result_rows jsonb := '[]'::jsonb;
  rows_affected integer := 0;
  rec record;
  sql_trimmed text;
BEGIN
  sql_trimmed := trim(lower(sql));
  
  IF sql_trimmed LIKE 'select%' OR sql_trimmed LIKE 'with%' OR sql_trimmed LIKE '%returning%' THEN
    FOR rec IN EXECUTE sql LOOP
      result_rows := result_rows || row_to_json(rec);
    END LOOP;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN jsonb_build_object('rows', result_rows, 'rows_affected', rows_affected);
  ELSE
    EXECUTE sql;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN jsonb_build_object('rows_affected', rows_affected);
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Add welcome bonus column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_welcome_bonus BOOLEAN DEFAULT FALSE;
