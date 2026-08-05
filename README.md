# KashWave Online Investment Platform

A fintech investment platform for Uganda (UGX) with mobile money integration,
automated ROI distribution, and an admin control center.

## Architecture

| Layer | Tech | Path |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | `frontend/` |
| Backend | Express.js + PostgreSQL | `backend/` |
| Database | PostgreSQL 14+ | Migrations in `backend/database/` |

## Key Features

- **Role-based access**: Investor dashboard (`/dashboard`) vs Admin panel (`/admin`)
- **2FA authentication**: TOTP via speakeasy + QR codes
- **JWT with refresh rotation**: Access tokens (15m), refresh tokens (7d), SHA-256 hashed in DB
- **Automated ROI engine**: Daily/weekly/monthly returns, Mon–Fri distribution
- **Payment providers**: MTN MoMo, Airtel Money, Marz Innovations (manual), USDT
- **KYC verification**: Document upload with magic-number file validation
- **Audit logging**: Immutable trails for all security events

## Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Backend: `http://localhost:5000` | Frontend: `http://localhost:3000`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions.

### Quick Start (Render + Vercel + Supabase)

1. Create Supabase project → apply migrations from `backend/database/`
2. `npm run db:seed` (optional, for demo data)
3. Deploy backend to Render — set env vars per `backend/.env.example`
4. Deploy frontend to Vercel — set `VITE_API_URL` to your Render URL

## Security Notes

- All JWT secrets, webhook secrets, and DB credentials are loaded from environment variables
- Payment amounts are only credited after **webhook signature verification**
- KYC documents are stored outside the public directory with path traversal protection
- Refresh tokens are **rotated** on every use — old tokens are immediately invalidated
