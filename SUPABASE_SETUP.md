# Supabase Setup Guide for VibeSocial

## Step 1 — Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign in with GitHub (or create an account)
3. Click **New project**
4. Fill in the form:
   - **Project name**: `vibesocial`
   - **Database password**: Choose a strong password and **save it somewhere safe**
   - **Region**: Choose the closest region to your users (e.g., `us-east-1` for US)
5. Click **Create new project** — wait ~2 minutes for it to provision

---

## Step 2 — Get Your API Keys

1. In your project dashboard, click **Settings** (gear icon, left sidebar)
2. Click **API**
3. Copy these values — you'll need them for both `.env` files:

| Value | Where to use |
|---|---|
| **Project URL** | `SUPABASE_URL` (server) + `VITE_SUPABASE_URL` (frontend) |
| **anon/public** key | `SUPABASE_ANON_KEY` (server) + `VITE_SUPABASE_ANON_KEY` (frontend) |
| **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` (server **only** — never expose to browser!) |

---

## Step 3 — Run the Database Schema

1. In the Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `server/src/db/migrations/001_initial_schema.sql` from your project
4. Copy the entire SQL content and paste it into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)
6. You should see **Success. No rows returned** — all tables, indexes, and RLS policies were created

---

## Step 4 — Create the Storage Bucket

1. In the dashboard, click **Storage** (left sidebar)
2. Click **New bucket**
3. Name: `vibesocial-uploads`
4. Make it **Public** (toggle on)
5. Click **Save**

Then add a Storage policy so authenticated users can upload (SQL Editor):

```sql
CREATE POLICY "auth_users_can_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vibesocial-uploads');
```

---

## Step 5 — Configure Auth Settings

1. Go to **Authentication** → **Providers** → make sure **Email** is enabled
2. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: Add `http://localhost:5173/**`

### Disable Email Confirmation (for faster development)
1. Go to **Authentication** → **Providers** → **Email**
2. Toggle off **Confirm email** (re-enable for production)

---

## Step 6 — Fill in Your .env Files

### `server/.env` (create from `server/.env.example`)
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:5173
```

### `vibesocial/.env` (create from `.env.example`)
```env
VITE_API_MODE=live
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Step 7 — Start the Development Servers

**Terminal 1 — Backend:**
```bash
cd vibesocial/server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd vibesocial
npm run dev
```

---

## Step 8 — Verify Everything Works

1. Open `http://localhost:5000/health` — should return `{"status":"ok"}`
2. Open `http://localhost:5173` — should show the Login page
3. Register → sign in → create an event → confirm it persists in Supabase Table Editor

---

## Stripe Setup (ticket payments)

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers → API Keys** → copy Publishable + Secret keys
3. For local webhooks: install [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:5000/api/orders/webhook
   ```
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

> **Test card**: `4242 4242 4242 4242` · any future expiry · any CVC

---

## OpenAI Setup (AI recommendations)

1. Go to [platform.openai.com](https://platform.openai.com), create account
2. **API Keys → Create new secret key** → copy to `OPENAI_API_KEY`
3. The AI endpoint gracefully falls back to top-rated events if the key is missing.
