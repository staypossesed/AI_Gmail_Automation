# AI Life Admin – Setup Status

## ✅ Done

| Item | Status | Notes |
|------|--------|------|
| **Environment variables** | ✅ Configured | `.env.local` has all required vars |
| **Clerk** | ✅ Ready | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` set |
| **Google OAuth** | ✅ Ready | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` set |
| **Gemini API** | ✅ Ready | `GEMINI_API_KEY` set |
| **App URL** | ✅ Ready | `NEXT_PUBLIC_APP_URL=http://localhost:3000` |
| **Build** | ✅ Passing | `npm run build` succeeds |
| **Prisma schema** | ✅ Ready | Models defined, migration SQL exists |
| **Prisma env loading** | ✅ Fixed | `prisma.config.ts` now loads `.env.local` |

### Gemini 429 "Quota exceeded" – Why it happened & prevention

**Root cause:** The free tier of `gemini-3-flash-preview` has a very low limit (~5 requests/min). A full sync runs AI classification on every new email (1 call per email), plus subscription extraction, deadline extraction, and insights. Visiting the dashboard triggered a full sync, which could exceed the limit in seconds.

**Prevention measures in place:**
1. **Model switch** – Using `gemini-1.5-flash`, which has higher free-tier limits.
2. **Graceful fallback** – On 429 or any Gemini error, the app returns safe defaults (e.g. "personal" classification) instead of crashing. Emails still appear.
3. **Sync cooldown** – Full sync (with AI) runs at most once every 5 minutes per session. Quick fetch (no AI) runs every 5s on the Emails page for fast inbox updates.
4. **Separation of concerns** – Emails page uses quick fetch (Gmail only, no AI). Dashboard uses full sync for insights, but with cooldown.

---

## ❌ Still Needed

### 1. PostgreSQL database

**Current:** `DATABASE_URL` points to `postgresql://user:password@localhost:5432/ai_life_admin`.

**Issue:** Prisma reports: `Can't reach database server at localhost:5432`.

**Options:**

- **Local PostgreSQL**
  - Install and start PostgreSQL.
  - Create DB: `createdb ai_life_admin`
  - Update `.env.local` with real user/password, e.g.:
    ```
    DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/ai_life_admin"
    ```

- **Hosted (recommended)**
  - Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres).
  - Copy the connection string into `.env.local` as `DATABASE_URL`.

### 2. Sync database schema

**For Supabase** (use `db push`—migrate dev needs a shadow DB that Supabase pooler doesn't support):

```bash
npx prisma db push
```

**For other PostgreSQL** (Neon, local, etc.):

```bash
npx prisma migrate dev
```

### 3. Google Cloud OAuth setup

In [Google Cloud Console](https://console.cloud.google.com):

1. Enable **Gmail API** for your project.
2. Create **OAuth 2.0 credentials** (Web application).
3. Add **Authorized redirect URI**:
   ```
   http://localhost:3000/api/auth/google/callback
   http://localhost:3001/api/auth/google/callback
   ```
4. For production, add:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
5. **App name on sign-in screen:** Go to **APIs & Services → OAuth consent screen**. The "App name" field is what users see (e.g. "AI-Automation-Bot"). Change it from "ThinkNest" if needed.
6. **Testing mode:** Add your email under **Test users** so you can sign in before the app is verified.

---

## Quick start (after DB is ready)

```bash
# 1. Apply migrations
npx prisma migrate dev

# 2. Start dev server
npm run dev
```

Then open http://localhost:3000, sign in, connect Gmail in Settings, and run Sync Gmail from the dashboard.
