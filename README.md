# AI Life Admin

AI-powered personal operations assistant. Connects to Gmail, analyzes emails for subscriptions, bills, and deadlines, and generates actionable insights.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN UI
- **Backend:** Next.js API routes
- **Database:** PostgreSQL + Prisma 7
- **Auth:** Clerk
- **AI:** Google Gemini API
- **Integrations:** Gmail API, Google OAuth

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

**Required:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same as GOOGLE_CLIENT_ID |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |

### 3. Database setup

```bash
npx prisma migrate dev
```

### 4. Run development server

```bash
npm run dev
```

## Google Cloud Setup

1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Gmail API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Add authorized redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Authenticated pages
│   │   ├── dashboard/   # Insight feed
│   │   ├── subscriptions/
│   │   ├── reminders/
│   │   ├── emails/
│   │   └── settings/
│   └── api/             # API routes
├── components/
│   ├── ui/              # ShadCN components
│   ├── insight-card.tsx
│   ├── subscription-card.tsx
│   └── email-summary.tsx
└── lib/
    ├── ai/              # Gemini AI services
    ├── gmail/           # Gmail API client
    ├── security.ts      # Prompt injection prevention
    ├── pipeline.ts      # Email processing pipeline
    └── database.ts
```

## Security

- **Prompt injection:** Email content is sanitized before sending to AI. Suspicious patterns are detected and redacted.
- **Structured output:** AI responses are validated as JSON. No instructions from emails are executed.
- **Metadata only:** Full email content is never stored—only sender, subject, snippet, timestamp.

## Future: Automation Layer

The pipeline exposes event hooks for future n8n integration:

- `emails_fetched`
- `email_classified`
- `subscription_detected`
- `reminder_created`
- `insights_generated`

## Deployment (Vercel)

1. Connect your repo to Vercel
2. Add environment variables
3. Use a PostgreSQL provider (Neon, Supabase, etc.) with standard `postgresql://` URL
4. Deploy
