const https = require('https');

const statements = [
  'DROP FUNCTION IF EXISTS exec_sql(text);',
  `CREATE OR REPLACE FUNCTION exec_sql(sql text)
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
         result_rows := result_rows || (row_to_json(rec)::jsonb);
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
   $$;`,
  'GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;',
  'GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_welcome_bonus BOOLEAN DEFAULT FALSE;'
];

async function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const req = https.request({
      hostname: 'fcbangmeuhvfojiyxdug.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': 'sb_publishable_2bP6lUYwP7WMnMC3GrH9oQ_seOenh6v',
        'Authorization': 'Bearer sb_publishable_2bP6lUYwP7WMnMC3GrH9oQ_seOenh6v',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.error) {
            reject(new Error(parsed.error));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const preview = sql.trim().split('\n')[0].substring(0, 60);
    try {
      const result = await execSQL(sql);
      console.log(`[${i + 1}/${statements.length}] OK: ${preview}...`);
      if (result.error) {
        console.log(`    Warning: ${result.error}`);
      }
    } catch (err) {
      console.log(`[${i + 1}/${statements.length}] FAIL: ${preview}...`);
      console.log(`    Error: ${err.message}`);
    }
  }
  console.log('\nDone.');
})();
