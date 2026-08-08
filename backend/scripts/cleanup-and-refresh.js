const https = require('https');

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
    console.log('=== CLEANING UP TEST DATA AND REFRESHING REAL USER DATA ===\n');
    
    // Real user emails to preserve
    const realUserEmails = [
      'adminkashwave@gmail.com',
      'akampurirajonan67@gmail.com',
      'tumukwasibwereymond@gmail.com',
      'allanakandwanaho1@gmail.com',
      'amumpairepolline7@gmail.com',
      'lovishshanie@gmail.com',
      'manirakizaben@gmail.com'
    ];
    
    // Step 1: Get all real users
    console.log('[1] Identifying real users...');
    const realUsers = await execSQL(
      `SELECT id, full_name, email, has_received_welcome_bonus FROM users WHERE email IN ($1, $2, $3, $4, $5, $6, $7)`,
      realUserEmails
    );
    console.log(`Found ${realUsers.rows.length} real users`);
    realUsers.rows.forEach(u => {
      console.log(`  - ${u.id}: ${u.email} | welcome_bonus: ${u.has_received_welcome_bonus}`);
    });
    
    // Step 2: Get all test users (users NOT in real list)
    console.log('\n[2] Identifying test users...');
    const testUsers = await execSQL(
      `SELECT id, email FROM users WHERE email NOT IN ($1, $2, $3, $4, $5, $6, $7) AND role = 'user'`,
      realUserEmails
    );
    console.log(`Found ${testUsers.rows.length} test users to remove`);
    
    // Step 3: Delete test users' transactions
    console.log('\n[3] Deleting test transactions...');
    const testUserIds = testUsers.rows.map(u => u.id);
    if (testUserIds.length > 0) {
      const deleteTxResult = await execSQL(
        `DELETE FROM transactions WHERE user_id IN (${testUserIds.map(id => id).join(',')})`
      );
      console.log(`Deleted transactions: rows_affected=${deleteTxResult.rows_affected}`);
      
      // Step 4: Delete test users' investments
      console.log('\n[4] Deleting test investments...');
      const deleteInvResult = await execSQL(
        `DELETE FROM investments WHERE user_id IN (${testUserIds.map(id => id).join(',')})`
      );
      console.log(`Deleted investments: rows_affected=${deleteInvResult.rows_affected}`);
      
      // Step 5: Delete test users' wallets
      console.log('\n[5] Deleting test wallets...');
      const deleteWalletResult = await execSQL(
        `DELETE FROM wallets WHERE user_id IN (${testUserIds.map(id => id).join(',')})`
      );
      console.log(`Deleted wallets: rows_affected=${deleteWalletResult.rows_affected}`);
      
      // Step 6: Delete test users
      console.log('\n[6] Deleting test users...');
      const deleteUserResult = await execSQL(
        `DELETE FROM users WHERE id IN (${testUserIds.map(id => id).join(',')})`
      );
      console.log(`Deleted users: rows_affected=${deleteUserResult.rows_affected}`);
    } else {
      console.log('No test users to delete');
    }
    
    // Step 7: Clean up test transactions from real users
    console.log('\n[7] Cleaning test transactions from real users...');
    const realUserIds = realUsers.rows.map(u => u.id);
    
    // Delete welcome_bonus transactions that are not from real login flow
    const deleteTestBonus = await execSQL(
      `DELETE FROM transactions WHERE type = 'welcome_bonus' AND user_id IN (${realUserIds.join(',')}) AND admin_notes = 'Welcome bonus for new user' AND amount = 5000`
    );
    console.log(`Deleted old 5000 bonus transactions: rows_affected=${deleteTestBonus.rows_affected}`);
    
    // Delete pending test deposits from testing sessions
    const deleteTestDeposits = await execSQL(
      `DELETE FROM transactions WHERE type = 'deposit' AND user_id IN (${realUserIds.join(',')}) AND status = 'pending' AND amount >= 10000`
    );
    console.log(`Deleted pending test deposits: rows_affected=${deleteTestDeposits.rows_affected}`);
    
    // Step 8: Ensure welcome bonus flag is reset for real users who haven't received it
    console.log('\n[8] Resetting welcome bonus flags for eligible real users...');
    const resetBonusResult = await execSQL(
      `UPDATE users SET has_received_welcome_bonus = FALSE WHERE email IN (${realUserEmails.map(e => `'${e.replace(/'/g, "''")}'`).join(',')}) AND has_received_welcome_bonus = TRUE`
    );
    console.log(`Reset bonus flags: rows_affected=${resetBonusResult.rows_affected}`);
    
    // Step 9: Verify final state
    console.log('\n[9] Verifying final state...');
    const finalUsers = await execSQL('SELECT id, email, has_received_welcome_bonus FROM users ORDER BY id');
    console.log(`Total users remaining: ${finalUsers.rows.length}`);
    finalUsers.rows.forEach(u => {
      console.log(`  - ${u.id}: ${u.email} | bonus: ${u.has_received_welcome_bonus}`);
    });
    
    const finalWallets = await execSQL('SELECT user_id, main_balance, total_deposited FROM wallets ORDER BY user_id');
    console.log('\nWallets:');
    finalWallets.rows.forEach(w => {
      console.log(`  - user ${w.user_id}: main=${w.main_balance}, deposited=${w.total_deposited}`);
    });
    
    const finalTx = await execSQL('SELECT COUNT(*) as count FROM transactions');
    console.log(`\nTotal transactions: ${finalTx.rows[0].count}`);
    
    console.log('\n✅ Database cleanup complete!');
    console.log('Next: All real users will receive 2000 bonus on next login/registration');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
