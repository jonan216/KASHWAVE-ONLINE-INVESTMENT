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
    const tables = await execSQL("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', JSON.stringify(tables, null, 2));
    
    const users = await execSQL('SELECT COUNT(*) AS count FROM users');
    console.log('Users count:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
