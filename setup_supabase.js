#!/usr/bin/env node
/**
 * Supabase Setup Helper for KashWave
 * Run this AFTER you create a Supabase project at supabase.com
 *
 * Usage:
 *   1. Create project at https://supabase.com/dashboard/projects
 *   2. Copy the project ref (e.g. abcdefghijklmnop)
 *   3. Run: node setup_supabase.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname);
const backendDir = path.join(ROOT, 'backend');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

(async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          KASHWAVE — SUPABASE DATABASE SETUP               ║
╚═══════════════════════════════════════════════════════════╝
`);

  // Check if already logged in
  try {
    execSync('supabase projects list', { stdio: 'pipe' });
  } catch (e) {
    console.log('[!] You need to login to Supabase first.');
    console.log('    Run: supabase login');
    console.log('    Or open https://supabase.com/dashboard/projects in your browser.\n');
    process.exit(1);
  }

  const projectRef = await ask('Enter your Supabase project ref (from project settings): ');

  if (!projectRef) {
    console.log('Project ref is required. Find it in: Supabase Dashboard → Project Settings → General → Reference ID');
    process.exit(1);
  }

  // Read SQL files
  const schemaSQL = fs.readFileSync(path.join(backendDir, 'database/schema.sql'), 'utf8');
  const migrationSQL = fs.readFileSync(path.join(backendDir, 'database/migrations/001_enterprise_schema.sql'), 'utf8');

  console.log('\n[1/3] Applying base schema...');
  try {
    execSync(`npx supabase db reset --project-ref ${projectRef}`, {
      cwd: backendDir,
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_PROJECT_REF: projectRef }
    });
  } catch (e) {
    console.log('  ⚠️  Reset failed, trying manual SQL push...');
    try {
      execSync(`npx supabase db push --project-ref ${projectRef}`, {
        cwd: backendDir,
        stdio: 'inherit',
        env: { ...process.env, SUPABASE_PROJECT_REF: projectRef }
      });
    } catch (e2) {
      console.log('  ⚠️  Auto-push failed. Please apply migrations manually:');
      console.log(`    1. Go to https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      console.log(`    2. Paste contents of backend/database/schema.sql`);
      console.log(`    3. Run it`);
      console.log(`    4. Paste contents of backend/database/migrations/001_enterprise_schema.sql`);
      console.log(`    5. Run it`);
    }
  }

  console.log('\n[2/3] Getting connection string...');
  const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              SUPABASE SETUP COMPLETE                       ║
╠═══════════════════════════════════════════════════════════╣
║  Project Ref: ${projectRef.padEnd(44)}║
║                                                            ║
║  Next steps:                                               ║
║  1. Go to Supabase Dashboard → Settings → Database         ║
║  2. Copy the "Connection string" (URI mode)                ║
║  3. Update backend/.env with:                              ║
║     DATABASE_URL=postgresql://postgres:[PASSWORD]@...      ║
║  4. Redeploy backend:                                      ║
║     cd backend && npx vercel --prod --yes                  ║
╚═══════════════════════════════════════════════════════════╝
`);

  console.log('Your Supabase dashboard: https://supabase.com/dashboard/project/' + projectRef);
})();
