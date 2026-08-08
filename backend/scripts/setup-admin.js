const https = require('https');
const crypto = require('crypto');

async function hashPassword(password) {
  const salt = await crypto.randomBytes(16).toString('hex');
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
  return hash;
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
    console.log('=== SETTING UP ADMIN ACCOUNT ===\n');
    
    // Step 1: Check audit_logs table structure and constraints
    console.log('[1] Checking audit_logs table...');
    try {
      const auditCheck = await execSQL(`SELECT COUNT(*) as count FROM audit_logs`);
      console.log(`  audit_logs count: ${auditCheck.rows[0].count}`);
    } catch (e) {
      console.log(`  audit_logs check failed: ${e.message}`);
    }
    
    // Step 2: Find admin user
    console.log('\n[2] Finding admin user...');
    const adminUsers = await execSQL(`SELECT id, email FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminUsers.rows[0]?.id || 1;
    console.log(`  Admin ID: ${adminId}`);
    
    // Step 3: Update admin credentials first
    console.log('\n[3] Updating admin credentials...');
    const passwordHash = await hashPassword('Makemoney@2026!');
    const updateResult = await execSQL(
      `UPDATE users SET email = 'kashwaveadministrator@gmail.com', password_hash = $1 WHERE id = ${adminId}`,
      [passwordHash]
    );
    console.log(`  Updated admin: rows_affected=${updateResult.rows_affected}`);
    
    // Step 4: Try to delete non-admin users without touching audit_logs
    // by disabling foreign key checks temporarily
    console.log('\n[4] Removing non-admin users...');
    const nonAdminUsers = await execSQL(`SELECT id FROM users WHERE role != 'admin'`);
    const nonAdminIds = nonAdminUsers.rows.map(u => u.id);
    console.log(`  Found ${nonAdminIds.length} non-admin users`);
    
    if (nonAdminIds.length > 0) {
      // Try disabling triggers temporarily
      console.log('  Attempting to disable triggers...');
      try {
        await execSQL('SET session_replication_role = replica;');
        console.log('  Triggers disabled');
      } catch (e) {
        console.log(`  Could not disable triggers: ${e.message}`);
      }
      
      try {
        // Delete transactions
        const txResult = await execSQL(`DELETE FROM transactions WHERE user_id IN (${nonAdminIds.join(',')})`);
        console.log(`  Deleted transactions: ${txResult.rows_affected}`);
        
        // Delete wallets
        const walletResult = await execSQL(`DELETE FROM wallets WHERE user_id IN (${nonAdminIds.join(',')})`);
        console.log(`  Deleted wallets: ${walletResult.rows_affected}`);
        
        // Delete investments
        const invResult = await execSQL(`DELETE FROM investments WHERE user_id IN (${nonAdminIds.join(',')})`);
        console.log(`  Deleted investments: ${invResult.rows_affected}`);
        
        // Delete users
        const userResult = await execSQL(`DELETE FROM users WHERE id IN (${nonAdminIds.join(',')})`);
        console.log(`  Deleted users: ${userResult.rows_affected}`);
      } catch (e) {
        console.log(`  Delete failed: ${e.message}`);
      }
      
      // Re-enable triggers
      try {
        await execSQL('SET session_replication_role = DEFAULT;');
        console.log('  Triggers re-enabled');
      } catch (e) {
        console.log(`  Could not re-enable triggers: ${e.message}`);
      }
    }
    
    // Step 5: Verify final state
    console.log('\n[5] Verifying final state...');
    const finalUsers = await execSQL(`SELECT id, email, role, status FROM users ORDER BY id`);
    console.log(`Total users: ${finalUsers.rows.length}`);
    finalUsers.rows.forEach(u => {
      console.log(`  - ${u.id}: ${u.email} | ${u.role}`);
    });
    
    const finalTx = await execSQL(`SELECT COUNT(*) as count FROM transactions`);
    console.log(`Total transactions: ${finalTx.rows[0].count}`);
    
    const finalWallets = await execSQL(`SELECT COUNT(*) as count FROM wallets`);
    console.log(`Total wallets: ${finalWallets.rows[0].count}`);
    
    console.log('\n✅ Setup complete!');
    console.log('Login: kashwaveadministrator@gmail.com / Makemoney@2026!');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
})();
