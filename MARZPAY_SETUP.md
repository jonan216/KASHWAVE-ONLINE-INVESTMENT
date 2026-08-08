# MarzPay Live Payment Setup Guide

**Last updated:** 2026-08-07

Complete these steps in order to enable live deposits/withdrawals via MarzPay.

---

## Step 1: Push Latest Code to GitHub

```bash
git add .
git commit -m "feat: finalize MarzPay live payment integration"
git push origin main
```

After pushing, Vercel will auto-deploy both frontend and backend.

---

## Step 2: Set Vercel Backend Environment Variables

1. Go to [vercel.com](https://vercel.com) → Your Project → **Backend Service** (the one with `api/index.js` entrypoint)
2. Click **Settings** → **Environment Variables**
3. Add/update these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MARZ_INNOVATIONS_API_KEY` | `marz_a7ryunjjiI8BBS9K` |
| `MARZ_INNOVATIONS_API_SECRET` | `tOxsq85zmCQrDvXB6jUouNnxqQQlSHYS` |
| `MARZ_INNOVATIONS_BASE_URL` | `https://wallet.wearemarz.com/api/v1` |
| `MARZPAY_CALLBACK_URL` | `https://kashwave-online-investment.vercel.app/api/webhooks/marz` |
| `CLIENT_ORIGIN` | `https://kashwave-online-investment.vercel.app` |
| `PAYMENT_WEBHOOK_SECRET` | `8a0b87ae7bb5952a3ba56985c4c15349c2006f5573f2987420e5dbc84af0297c29efeaa104ff0f1aba3ddd3877d2d35adb172b8b194a3956e95657cebd952998` |

4. Click **Save**
5. Go to **Deployments** → Click **Redeploy** to apply the new env vars

---

## Step 3: Configure MarzPay Dashboard

1. Log in to [https://wallet.wearemarz.com](https://wallet.wearemarz.com)
2. Go to **Settings** → **API Keys** and verify your credentials:
   - API Key: `marz_a7ryunjjiI8BBS9K`
   - API Secret: `tOxsq85zmCQrDvXB6jUouNnxqQQlSHYS`
3. Go to **Webhooks** or **Callback URLs** and add:
   ```
   https://kashwave-online-investment.vercel.app/api/webhooks/marz
   ```
4. Go to **Services** / **Marketplace** and ensure **Collections** is subscribed/enabled
5. If available, **whitelist Vercel IPs** for webhook delivery (check MarzPay docs for current IP ranges)

---

## Step 4: Apply Supabase Database Migration

The `payment_transactions` table must exist in your Supabase database.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/fcbangmeuhvfojiyxdug)
2. Click **SQL Editor** → **New Query**
3. Paste and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual'
        CHECK (provider IN ('mtn_momo', 'airtel_money', 'visa', 'mastercard', 'bank_transfer', 'manual', 'marz_innovations')),
    reference_number VARCHAR(255) UNIQUE NOT NULL,
    internal_reference VARCHAR(60) UNIQUE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'UGX' CHECK (currency IN ('UGX', 'USD')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'webhook_received', 'verified', 'credited', 'failed', 'rejected')),
    webhook_payload JSONB DEFAULT NULL,
    webhook_signature VARCHAR(500) DEFAULT NULL,
    signature_verified BOOLEAN DEFAULT FALSE,
    wallet_credited BOOLEAN DEFAULT FALSE,
    failure_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_ref ON payment_transactions(reference_number);

CREATE TRIGGER trg_update_payment_tx_timestamp
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

4. Click **Run** — you should see "Success. No rows returned"

---

## Step 5: Verify Phone Number Format

The deposit page accepts phone numbers like `0770123456`. The backend now automatically converts them to E.164 format (`+256770123456`) before sending to MarzPay.

**Test the conversion:**
- Enter `0770123456` on the deposit page → backend sends `+256770123456` to MarzPay
- Enter `256770123456` → backend sends `+256770123456`
- Enter `+256770123456` → backend sends `+256770123456`

---

## Step 6: Test the Payment Flow

1. Open [https://kashwave-online-investment.vercel.app](https://kashwave-online-investment.vercel.app)
2. Register / log in
3. Go to **Deposit** page
4. Enter amount (minimum UGX 10)
5. Select **MTN Mobile Money** or **Airtel Money**
6. Enter phone number (e.g. `0771178213`)
7. Click **Deposit Now**

**What happens:**
- Button changes to **"Waiting for confirmation..."** (spinner)
- Backend calls MarzPay `POST /collect-money`
- **MarzPay sends PIN prompt SMS to the phone number entered**
- User enters PIN on their phone
- MarzPay sends webhook to `/api/webhooks/marz`
- Backend verifies webhook → credits wallet
- Frontend detects status change → shows **"Payment confirmed! Your wallet has been updated."**
- Redirects to transactions page
- Dashboard balance updates automatically within 5 seconds

---

## Step 7: Verify Backend Logs

Check Vercel backend logs to confirm the flow:
1. Vercel Dashboard → Backend Service → **Logs**
2. Look for:
   ```
   [MARZ] initPayment ...
   ```
   This means the backend successfully called MarzPay
3. After user confirms PIN on phone, look for:
   ```
   deposit_webhook_credited
   ```
   This means the webhook was received and wallet was credited

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MarzPay API credentials not configured" | Backend env vars not set on Vercel → Step 2 |
| Webhook not received | Check MarzPay dashboard webhook URL → Step 3 |
| "payment_transactions does not exist" | Run migration SQL → Step 4 |
| Phone number not receiving PIN | Verify phone format is correct (E.164) → Step 5 |
| Payment stuck in "pending" | Check Vercel logs for webhook delivery errors |

---

## Important Notes

- **No PIN appears on KashWave dashboard** — PIN is sent directly by MarzPay to the user's phone
- **Wallet is only credited after webhook confirmation** — never trust frontend or create-response alone
- **Use sandbox mode first** — Test with MarzPay sandbox credentials before going live
- **Redeploy after env changes** — Vercel requires redeploy for new env vars to take effect

---

## Current Live URLs

- **Frontend & Backend:** https://kashwave-online-investment.vercel.app
- **Webhook:** https://kashwave-online-investment.vercel.app/api/webhooks/marz
- **MarzPay Dashboard:** https://wallet.wearemarz.com
