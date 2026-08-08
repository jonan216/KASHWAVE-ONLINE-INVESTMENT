const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

function escapeSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const items = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',');
    return `(${items})`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function substituteParams(sql, params) {
  if (!params || params.length === 0) return sql;
  let result = sql;
  for (let i = 0; i < params.length; i++) {
    const placeholder = new RegExp('\\$' + (i + 1) + '\\b');
    const replacement = escapeSqlValue(params[i]);
    let match;
    while ((match = placeholder.exec(result)) !== null) {
      result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
      placeholder.lastIndex = match.index + replacement.length;
    }
  }
  return result;
}

function execSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    const finalSQL = substituteParams(sql, params);
    const body = JSON.stringify({ sql: finalSQL });
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
    console.log('=== FIXING ADMIN PASSWORD ===\n');
    
    // Step 1: Generate correct bcrypt hash
    console.log('[1] Generating bcrypt password hash...');
    const passwordHash = await hashPassword('Makemoney@2026!');
    console.log('  Hash generated:', passwordHash.substring(0, 30) + '...');
    
    // Step 2: Update admin password with correct hash
    console.log('\n[2] Updating admin password...');
    const updateResult = await execSQL(
      `UPDATE users SET password_hash = $1 WHERE email = 'kashwaveadministrator@gmail.com'`,
      [passwordHash]
    );
    console.log(`  Updated: rows_affected=${updateResult.rows_affected}`);
    
    // Step 3: Verify admin login works
    console.log('\n[3] Testing admin login...');
    const loginData = JSON.stringify({
      email: 'kashwaveadministrator@gmail.com',
      password: 'Makemoney@2026!'
    });
    
    const loginReq = https.request({
      hostname: 'kashwave-online-investment.vercel.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, (loginRes) => {
      let loginBody = '';
      loginRes.on('data', (chunk) => loginBody += chunk);
      loginRes.on('end', () => {
        const loginJson = JSON.parse(loginBody);
        console.log(`  Login status: ${loginRes.statusCode}`);
        console.log(`  Success: ${loginJson.success}`);
        if (loginJson.success) {
          console.log('  Admin login works!');
          
          // Step 4: Test deposit with admin token
          console.log('\n[4] Testing deposit...');
          const depositData = JSON.stringify({
            amount: 10000,
            payment_method: 'MTN Mobile Money',
            payment_provider: 'marz_innovations',
            source_account: '0771178213'
          });
          
          const depositReq = https.request({
            hostname: 'kashwave-online-investment.vercel.app',
            path: '/api/transactions/deposit',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + loginJson.data.accessToken,
              'Content-Length': Buffer.byteLength(depositData)
            }
          }, (depositRes) => {
            let depositBody = '';
            depositRes.on('data', (chunk) => depositBody += chunk);
            depositRes.on('end', () => {
              console.log(`  Deposit status: ${depositRes.statusCode}`);
              console.log(`  Response: ${depositBody}`);
            });
          });
          depositReq.write(depositData);
          depositReq.end();
        } else {
          console.log('  Login failed:', loginJson.message);
        }
      });
    });
    
    loginReq.write(loginData);
    loginReq.end();
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
})();
