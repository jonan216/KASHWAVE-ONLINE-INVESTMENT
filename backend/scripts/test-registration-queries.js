const https = require('https');

function execSQL(sql) {
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
  try {
    // Test SELECT with RETURNING pattern
    const testInsert = await execSQL("INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code) VALUES ('Test', 'test@test.com', 'hash', 'user', true, 'TEST-123') RETURNING id, full_name, email, role, status, referral_code, created_at");
    console.log('INSERT RETURNING:', JSON.stringify(testInsert, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
