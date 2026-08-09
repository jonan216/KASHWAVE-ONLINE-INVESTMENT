const https = require('https');

const sql = `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by_code';`;

const data = JSON.stringify({ sql });

const url = new URL('https://fcbangmeuhvfojiyxdug.supabase.co/rest/v1/rpc/exec_sql');
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'apikey': 'sb_publishable_2bP6lUYwP7WMnMC3GrH9oQ_seOenh6v',
    'Authorization': 'Bearer sb_publishable_2bP6lUYwP7WMnMC3GrH9oQ_seOenh6v',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  },
  timeout: 30000
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('status:', res.statusCode, body);
  });
});

req.on('error', (e) => console.log('error:', e.message));
req.write(data);
req.end();
