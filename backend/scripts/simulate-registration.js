const https = require('https');

function escapeSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
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
    const testEmail = 'regtest2' + Date.now() + '@test.com';
    
    console.log('Test email:', testEmail);
    
    // Step 1: Insert user (exact query from UserModel.create)
    console.log('\n[1] Inserting user...');
    const insertResult = await execSQL(
      `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, referral_code) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['RegTest', testEmail, 'hash123', 'user', true, 'KW-TEST123']
    );
    console.log('Insert result:', JSON.stringify(insertResult, null, 2));
    
    // Step 2: Select user (exact query from UserModel.create)
    console.log('\n[2] Selecting user...');
    const selectResult = await execSQL(
      `SELECT id, full_name, email, role, status, referral_code, created_at FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1`,
      [testEmail]
    );
    console.log('Select result:', JSON.stringify(selectResult, null, 2));
    
    if (selectResult.rows && selectResult.rows.length > 0) {
      const userId = selectResult.rows[0].id;
      
      // Step 3: Insert wallet
      console.log('\n[3] Inserting wallet...');
      const walletResult = await execSQL(
        `INSERT INTO wallets (user_id, main_balance, investment_balance, total_earnings, total_deposited, total_withdrawn) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 0.00, 0.00, 0.00, 0.00, 0.00]
      );
      console.log('Wallet result:', JSON.stringify(walletResult, null, 2));
      
      console.log('\n✅ Registration simulation completed successfully');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
