const https = require('https');

function execSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    const finalSQL = params.length > 0 ? sql.replace(/\$(\d+)/g, (match, i) => {
      const val = params[parseInt(i) - 1];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return `'${String(val).replace(/'/g, "''")}'`;
    }) : sql;
    
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
    console.log('=== AUDITING EXISTING USERS ===\n');
    
    // Get all users
    const users = await execSQL('SELECT id, full_name, email, role, status, has_received_welcome_bonus, created_at FROM users ORDER BY id');
    console.log(`Total users: ${users.rows.length}`);
    console.log(JSON.stringify(users.rows, null, 2));
    
    // Get all wallets
    const wallets = await execSQL('SELECT user_id, main_balance, investment_balance, total_earnings, total_deposited, total_withdrawn FROM wallets');
    console.log('\n=== WALLETS ===');
    console.log(JSON.stringify(wallets.rows, null, 2));
    
    // Get all transactions
    const transactions = await execSQL('SELECT id, user_id, type, amount, status, payment_method, admin_notes, created_at FROM transactions ORDER BY created_at DESC LIMIT 50');
    console.log('\n=== RECENT TRANSACTIONS ===');
    console.log(JSON.stringify(transactions.rows, null, 2));
    
    // Get all investments
    const investments = await execSQL('SELECT id, user_id, invested_amount, status, start_date, end_date FROM investments');
    console.log('\n=== INVESTMENTS ===');
    console.log(JSON.stringify(investments.rows, null, 2));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
