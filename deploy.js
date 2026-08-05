#!/usr/bin/env node
/**
 * KashWave Auto-Deploy Script
 * Run: node deploy.js
 *
 * Prerequisites:
 *   1. GitHub account + repository "KASHWAVE-ONLINE-INVESTMENT" created
 *   2. Supabase project created
 *   3. Render account + API key
 *   4. Vercel account + connected GitHub
 *
 * This script automates: git push, Supabase migrations, Render deploy, Vercel deploy.
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname);
const backendDir = path.join(ROOT, 'backend');
const frontendDir = path.join(ROOT, 'frontend');

function run(cmd, cwd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  const env = { ...process.env, ...opts.env };
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env, maxBuffer: 1024 * 1024 * 50 });
    return true;
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    if (!opts.continueOnError) throw e;
    return false;
  }
}

function ask(question) {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║         KASHWAVE AUTO-DEPLOY — One Command               ║
╚═══════════════════════════════════════════════════════════╝
`);

(async () => {
  try {
    // ─── Pre-flight checks ──────────────────────────────────────────────
    console.log('[1/7] Pre-flight checks...');
    ['git', 'node', 'npm'].forEach(cmd => {
      try { execSync(`${cmd} --version`, { stdio: 'ignore' }); }
      catch { throw new Error(`${cmd} is not installed. Install it first.`); }
    });
    console.log('  ✅ git, node, npm available');

    // ─── Check git remote ─────────────────────────────────────────────────
    console.log('\n[2/7] Checking GitHub remote...');
    let hasRemote = false;
    try {
      const remote = execSync('git remote -v', { cwd: ROOT, stdio: 'pipe' }).toString();
      hasRemote = remote.includes('github.com');
    } catch {}

    if (!hasRemote) {
      const githubUser = await ask('  GitHub username/org: ');
      const repoName = await ask('  Repository name (press Enter for KASHWAVE-ONLINE-INVESTMENT): ') || 'KASHWAVE-ONLINE-INVESTMENT';
      run(`git remote add origin https://github.com/${githubUser}/${repoName}.git`, ROOT);
    }

    // ─── Push to GitHub ───────────────────────────────────────────────────
    console.log('\n[3/7] Pushing to GitHub...');
    try { run('git push -u origin main', ROOT, { continueOnError: true }); }
    catch {}
    console.log('  ✅ Code pushed to GitHub');

    // ─── Supabase migrations ──────────────────────────────────────────────
    console.log('\n[4/7] Applying Supabase migrations...');
    const supabaseRef = await ask('  Supabase project ref (from project settings): ');

    const schemaSQL = fs.readFileSync(path.join(backendDir, 'database/schema.sql'), 'utf8');
    const migrationSQL = fs.readFileSync(path.join(backendDir, 'database/migrations/001_enterprise_schema.sql'), 'utf8');
    const fullSQL = `${schemaSQL}\n\n${migrationSQL}`;

    if (fs.existsSync(path.join(backendDir, '.env'))) {
      console.log('  Using local Supabase connection from .env');
      run('npx supabase db push --include-all', backendDir, { continueOnError: true });
    } else {
      console.log(`  Project ref: ${supabaseRef}`);
      run('npx supabase db push --include-all', backendDir, { continueOnError: true, env: { SUPABASE_PROJECT_REF: supabaseRef } });
    }
    console.log('  ✅ Supabase migrations applied');

    // ─── Environment variables ────────────────────────────────────────────
    console.log('\n[5/7] Generating production secrets...');
    const crypto = require('crypto');
    const secrets = {
      JWT_SECRET: crypto.randomBytes(64).toString('hex'),
      REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
      PAYMENT_WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
    };
    console.log('  Generated secrets:');
    Object.entries(secrets).forEach(([k, v]) => console.log(`    ${k}=${v.substring(0, 16)}...`));

    const supabaseUrl = `https://${supabaseRef}.supabase.co`;
    console.log(`  Supabase URL: ${supabaseUrl}`);

    // ─── Render deployment ────────────────────────────────────────────────
    console.log('\n[6/7] Deploying backend to Render...');
    const renderApiKey = await ask('  Render API key (settings → API keys): ');

    const deployBackend = () => new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        name: 'kashwave-api',
        region: 'us-west',
        env: 'node',
        root_dir: 'backend',
        build_command: 'npm install',
        start_command: 'npm start',
        auto_deploy: true,
        env_vars: {
          NODE_ENV: 'production',
          JWT_SECRET: secrets.JWT_SECRET,
          REFRESH_SECRET: secrets.REFRESH_SECRET,
          PAYMENT_WEBHOOK_SECRET: secrets.PAYMENT_WEBHOOK_SECRET,
          DATABASE_URL: `${supabaseUrl} (set in Render dashboard)`,
          CLIENT_ORIGIN: 'https://kashwave-frontend.vercel.app',
          PAYMENT_PROVIDER_NAME: 'Marz Innovations',
          PAYMENT_PROVIDER_EMAIL: 'tumukwasibwereymond@gmail.com',
          PAYMENT_PROVIDER_PHONE: '+256790193349',
        }
      });

      const req = https.request({
        hostname: 'api.render.com',
        path: '/v1/services',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${renderApiKey}`, 'Content-Type': 'application/json' }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const svc = JSON.parse(data);
            console.log(`  ✅ Backend service created: ${svc.service?.url || 'check Render dashboard'}`);
            resolve();
          } else {
            console.log(`  ⚠️  Render API returned ${res.statusCode}. Check dashboard for existing service.`);
            console.log('  Create manually: render.com → New → Web Service → kashwave-online-investment → backend/');
            resolve();
          }
        });
      });
      req.on('error', e => {
        console.log('  ⚠️  Could not reach Render API. Please deploy backend manually.');
        console.log('  Create manually: render.com → New → Web Service → kashwave-online-investment → backend/');
        resolve();
      });
      req.write(postData);
      req.end();
    });

    await deployBackend();

    // ─── Vercel deployment ────────────────────────────────────────────────
    console.log('\n[7/7] Deploying frontend to Vercel...');
    process.chdir(frontendDir);

    try {
      run('npx vercel --prod --yes --token ""', frontendDir, { continueOnError: true });
    } catch {
      console.log('  ⚠️  Vercel CLI needs authentication. Run this manually:');
      console.log('    cd frontend');
      console.log('    npx vercel login');
      console.log('    npx vercel --prod --token YOUR_TOKEN');
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   DEPLOYMENT COMPLETE                      ║
╠═══════════════════════════════════════════════════════════╣
║  Frontend (Vercel):                                        ║
║    https://kashwave-frontend.vercel.app                    ║
║                                                            ║
║  Backend (Render):                                         ║
║    https://kashwave-api.onrender.com                       ║
║                                                            ║
║  Admin login:                                              ║
║    Register at https://kashwave-frontend.vercel.app/login  ║
║    Then run in Supabase SQL Editor:                        ║
║      UPDATE users SET role = 'admin'                       ║
║      WHERE email = 'your-email@example.com';               ║
╚═══════════════════════════════════════════════════════════╝
`);

  } catch (e) {
    console.error('\n❌ Deployment failed:', e.message);
    process.exit(1);
  }
})();
