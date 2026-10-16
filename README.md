# Paisa — voice-first expense tracker (PWA)

A mobile-first, offline-first expense tracker. Add credits and debits by speaking or typing a short note
("tea 20, metro 40, got 2000 from Rahul"); AI turns it into transactions. Everything also works by hand, without AI.

You bring your own keys: a free [Groq](https://console.groq.com) API key for parsing (and Whisper speech-to-text),
and a free [Supabase](https://supabase.com) project for sync across devices. Keys are stored only on your device.

## Stack

- Next.js (App Router, TypeScript), Tailwind, shadcn/ui
- PWA via Serwist (installable, offline app shell)
- Dexie (IndexedDB) as the source of truth on the device; background sync to Supabase Postgres with RLS
- Groq: `openai/gpt-oss-20b` with model and key failover; `whisper-large-v3-turbo` for voice where the browser's Web Speech API is weak

## Run it yourself

1. **Clone and install**
   ```bash
   git clone <this repo> && cd expense-tracker && npm install
   ```
2. **Supabase (optional, for sync)**
   - Create a free project at supabase.com.
   - Open the SQL editor and run `supabase/migrations/0001_init.sql`.
   - Authentication → Providers: enable Email (magic link). Add your site URL under URL configuration.
   - Copy the Project URL and anon key from Settings → API. Either paste them in the app's onboarding screen,
     or put them in `.env.local` (see `.env.example`) so your deployment has them as defaults.
3. **Groq (optional, for AI)**
   - Create a free key at console.groq.com and paste it into the app (onboarding or Settings → AI keys).
   - Add several keys; when one is rate-limited the next is used, and when all fail the next model in the chain is tried.
4. **Dev / build**
   ```bash
   npm run dev
   ```
   ```bash
   npm run build && npm start
   ```
   The service worker is only generated in the production build.
5. **Deploy**: any static-friendly Node host works; Vercel's free tier is the simplest (`vercel deploy`).

## Free-tier notes

- Supabase free projects have no expiry; 500 MB database, 2 projects. A project pauses after 7 days without
  activity and resumes with one click (data is kept). Daily use keeps it awake.
- Groq's free tier is rate-limited per key; the app rotates keys and models automatically.

## Project layout

```
app/            routes: / (home), /add, /transactions, /calendar, /analytics, /settings, /onboarding, sw.ts, manifest.ts
components/     TxnForm, TxnList, BottomNav, CategoryIcon, Providers, ui/ (shadcn)
hooks/          live Dexie queries
lib/db/         Dexie schema, seed, repository helpers
lib/sync/       push/pull engine (dirty flags + updated_at cursors + soft-delete tombstones)
lib/auth/       Supabase session
lib/ai/         Groq key pool (model chain, parser and voice coming next)
lib/settings.ts device-local settings (keys, currency, speech)
supabase/       SQL migrations
```
