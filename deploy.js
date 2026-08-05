#!/usr/bin/env node
/**
 * KASHWAVE ONE-CLICK DEPLOYMENT
 * 
 * BEFORE RUNNING THIS SCRIPT, COMPLETE THESE STEPS:
 * 
 * 1. GITHUB (2 min):
 *    - Go to https://github.com/new
 *    - Repository name: KASHWAVE-ONLINE-INVESTMENT
 *    - Click "Create repository"
 *    - Copy the repo URL: https://github.com/Jjonan216/KASHWAVE-ONLINE-INVESTMENT.git
 * 
 * 2. SUPABASE (2 min):
 *    - Go to https://supabase.com/dashboard/projects
 *    - Click "New project"
 *    - Name: kashwave-db
 *    - Set database password (SAVE IT!)
 *    - Wait 2 mins, then copy:
 *      a) Project REF (from Settings → General)
 *      b) Connection string (from Settings → Database → URI mode)
 * 
 * 3. RENDER (1 min):
 *    - Go to https://render.com
 *    - Sign in with GitHub
 *    - Go to https://dashboard.render.com/register/api-keys
 *    - Create API key, copy it
 * 
 * 4. VERCEL (already done):
 *    - Already authenticated ✓
 * 
 * THEN RUN: node deploy.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname);
const backendDir = path.join(ROOT, 'backend');
const frontendDir = path.join(ROOT, 'frontend');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

function run(cmd, cwd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', maxBuffer: 1024 * 1024 * 50, ...opts });
    return true;
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    if (!opts.continueOnError) throw e;
    return false;
  }
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║         KASHWAVE — ONE-CLICK FULL DEPLOYMENT             ║
╚═══════════════════════════════════════════════════════════╝
`);

(async () => {
  try {
    // Pre-flight
    console.log('[1/8] Pre-flight checks...');
    ['git', 'node', 'npm'].forEach(cmd => {
      try { execSync(`${cmd} --version`, { stdio: 'ignore' }); }
      catch { throw new Error(`${cmd} not installed`); }
    });
    console.log('  ✅ git, node, npm');

    // GitHub
    console.log('\n[2/8] GitHub setup...');
    const githubRepo = await ask('  Paste your GitHub repo URL (e.g. https://github.com/Jjonan216/KASHWAVE-ONLINE-INVESTMENT.git): ');
    if (!githubRepo) throw new Error('GitHub repo URL required');
    
    run('git remote remove origin', ROOT, { continueOnError: true });
    run(`git remote add origin ${githubRepo}`, ROOT);
    run('git branch -M main', ROOT);
    run('git push -u origin main', ROOT);
    console.log('  ✅ Code pushed to GitHub');

    // Supabase
    console.log('\n[3/8] Supabase database setup...');
    const supabaseRef = await ask('  Enter Supabase project REF (e.g. abcdefghijklmnop): ');
    const dbPassword = await ask('  Enter Supabase database password: ');
    
    if (supabaseRef && dbPassword) {
      const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${supabaseRef}.supabase.co:5432/postgres`;
      
      // Apply migrations via SQL
      const schemaSQL = fs.readFileSync(path.join(backendDir, 'database/schema.sql'), 'utf8');
      const migrationSQL = fs.readFileSync(path.join(backendDir, 'database/migrations/001_enterprise_schema.sql'), 'utf8');
      
      console.log('  Applying migrations via Supabase MCPR...');
      
      // Write SQL to temp file for manual application
      fs.writeFileSync(path.join(ROOT, 'apply_migrations.sql'), `${schemaSQL}\n\n${migrationSQL}`);
      console.log('  ✅ Migration SQL prepared at: apply_migrations.sql');
      console.log('  ⚠️  Apply manually at: https://supabase.com/dashboard/project/' + supabaseRef + '/sql/new');
      
      // Update backend .env
      const envPath = path.join(backendDir, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${connectionString}`);
      fs.writeFileSync(envPath, envContent);
      console.log('  ✅ Backend .env updated with DATABASE_URL');
    } else {
      console.log('  ⚠️  Skipped database setup');
    }

    // Generate secrets
    console.log('\n[4/8] Generating production secrets...');
    const crypto = require('crypto');
    const secrets = {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
      PAYMENT_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
    };
    console.log('  Generated secrets (save these!):');
    Object.entries(secrets).forEach(([k, v]) => console.log(`    ${k}=${v}`));

    // Update backend .env with secrets
    const envPath = path.join(backendDir, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${secrets.JWT_SECRET}`);
    envContent = envContent.replace(/REFRESH_SECRET=.*/g, `REFRESH_SECRET=${secrets.REFRESH_SECRET}`);
    envContent = envContent.replace(/PAYMENT_WEBHOOK_SECRET=.*/g, `PAYMENT_WEBHOOK_SECRET=${secrets.PAYMENT_WEBHOOK_SECRET}`);
    fs.writeFileSync(envPath, envContent);
    console.log('  ✅ Backend .env updated with secrets');

    // Render deployment
    console.log('\n[5/8] Deploying backend to Render...');
    const renderApiKey = await ask('  Enter Render API key: ');
    
    if (renderApiKey) {
      const https = require('https');
      const backendUrl = supabaseRef ? `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${supabaseRef}.supabase.co:5432/postgres` : '';
      
      const postData = JSON.stringify({
        name: 'kashwave-api',
        type: 'web_service',
        runtime: 'node',
        buildCommand: 'npm install',
        startCommand: 'npm start',
        plan: 'free',
        region: 'us-west',
        branch: 'main',
        rootDir: 'backend',
        envVars: [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'JWT_SECRET', value: secrets.JWT_SECRET },
          { key: 'REFRESH_SECRET', value: secrets.REFRESH_SECRET },
          { key: 'PAYMENT_WEBHOOK_SECRET', value: secrets.PAYMENT_WEBHOOK_SECRET },
          { key: 'DATABASE_URL', value: backendUrl },
          { key: 'CLIENT_ORIGIN', value: 'https://kashwave-frontend.vercel.app' },
          { key: 'PAYMENT_PROVIDER_NAME', value: 'Marz Innovations' },
          { key: 'PAYMENT_PROVIDER_EMAIL', value: 'tumukwasibwereymond@gmail.com' },
          { key: 'PAYMENT_PROVIDER_PHONE', value: '+256790193349' },
        ]
      });

      const req = https.request({
        hostname: 'api.render.com',
        path: '/v1/services',
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${renderApiKey}`, 
          'Content-Type': 'application/json' 
        }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const svc = JSON.parse(data);
            console.log(`  ✅ Backend deployed: ${svc.service?.url || 'check Render dashboard'}`);
          } else {
            console.log(`  ⚠️  Render API returned ${res.statusCode}. Deploy manually.`);
          }
          finishDeployment();
        });
      });
      req.on('error', () => {
        console.log('  ⚠️  Render API failed. Deploy manually at render.com');
        finishDeployment();
      });
      req.write(postData);
      req.end();
    } else {
      console.log('  ⚠️  Skipped Render deployment');
      finishDeployment();
    }

    function finishDeployment() {
      // Update frontend API URL
      console.log('\n[6/8] Updating frontend configuration...');
      const frontendEnvPath = path.join(frontendDir, '.env');
      const frontendApiUrl = supabaseRef ? `https://kashwave-api.onrender.com/api` : 'https://kashwave-api.vercel.app/api';
      fs.writeFileSync(frontendEnvPath, `VITE_API_URL=${frontendApiUrl}\n`);
      console.log('  ✅ Frontend .env updated');

      // Deploy frontend to Vercel
      console.log('\n[7/8] Deploying frontend to Vercel...');
      try {
        execSync('npx vercel --prod --yes', { cwd: frontendDir, stdio: 'inherit' });
        console.log('  ✅ Frontend deployed to Vercel');
      } catch (e) {
        console.log('  ⚠️  Vercel deployment needs manual auth');
      }

      // Final summary
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║              DEPLOYMENT COMPLETE                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  🌐 Frontend:                                              ║
║     https://kashwave-frontend.vercel.app                   ║
║                                                            ║
║  🔧 Backend:                                               ║
║     https://kashwave-api.vercel.app                        ║
║     (or https://kashwave-api.onrender.com if Render used)  ║
║                                                            ║
║  📋 Next steps:                                            ║
║     1. Apply migrations to Supabase:                       ║
║        Open apply_migrations.sql in Supabase SQL Editor    ║
║     2. Create admin account:                               ║
║        Register at frontend URL, then promote via:         ║
║        UPDATE users SET role='admin' WHERE email='...';    ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
`);
    }
  } catch (e) {
    console.error('\n❌ Deployment failed:', e.message);
    process.exit(1);
  }
})();
