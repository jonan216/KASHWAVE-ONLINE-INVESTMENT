# KashWave Platform Deployment Guide

## Deploy to Supabase (PostgreSQL Database)

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com) → New Project
- Set database password (save it!)
- Choose region closest to your users

### 2. Get Connection String
In Supabase Dashboard → Project Settings → Database → Connection string (URI mode):
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/kashwave_db
```

### 3. Apply Migrations
Run both schema files in the Supabase SQL Editor:
1. `backend/database/schema.sql` (base schema)
2. `backend/database/migrations/001_enterprise_schema.sql` (enterprise extensions)

Or use the Supabase CLI:
```bash
supabase db push
```

### 4. Enable Extensions
In Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Deploy Backend to Render

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kashwave-backend.git
git push -u origin main
```

### 2. Create Render Web Service
- Go to [render.com](https://render.com) → New → Web Service
- Connect your GitHub repo
- Select `backend/` directory
- Build command: `npm install`
- Start command: `npm start`

### 3. Set Environment Variables
In Render Dashboard → Environment → Environment Variables:
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (64-char hex from `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `REFRESH_SECRET` | (different 64-char hex) |
| `PAYMENT_WEBHOOK_SECRET` | (strong random key) |
| `DATABASE_URL` | (Supabase connection string from step 2) |
| `CLIENT_ORIGIN` | `https://kashwave-frontend.vercel.app` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_USER` | `tumukwasibwereymond@gmail.com` |
| `EMAIL_PASS` | (Gmail App Password — not regular password) |
| `PAYMENT_PROVIDER_NAME` | `Marz Innovations` |
| `PAYMENT_PROVIDER_EMAIL` | `tumukwasibwereymond@gmail.com` |
| `PAYMENT_PROVIDER_PHONE` | `+256771178213` |

## Deploy Frontend to Vercel

### 1. Connect GitHub Repo
- Go to [vercel.com](https://vercel.com) → New Project
- Import your frontend repo (or monorepo root)
- Set Root Directory: `frontend/`

### 2. Environment Variables
In Vercel → Settings → Environment Variables:
| Key | Value |
|---|---|
| `VITE_API_URL` | `https://kashwave-api.onrender.com/api` |

### 3. Build Settings
- Build command: `npm install && npm run build`
- Output directory: `dist/`

## Post-Deployment Setup

### Create Admin Account
After deployment, register an admin account:
```bash
curl -X POST https://kashwave-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin","email":"admin@kashwave.com","password":"SecureAdminPass123!"}'
```

Then promote to admin in Supabase SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@kashwave.com';
```
