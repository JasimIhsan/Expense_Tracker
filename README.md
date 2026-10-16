# Paisa — voice-first expense tracker (PWA)

A mobile-first, offline-first expense tracker built for rush hour. Say or type a short note —
*"tea 20, metro 40, got 2000 from Rahul"* — and it becomes transactions. Everything also works by hand, without AI.

Configuration is environment-only: a free [Groq](https://console.groq.com) key (or several) for parsing and Whisper
speech-to-text, and a free [Supabase](https://supabase.com) project for sync. Keys stay on the server; nothing is sent
to anyone else's service.

## Features

**Capture**
- Quick-add bar: type or hold-to-talk. Items appear as editable chips and auto-save after 3 s (undo in the toast).
- Instant local parser handles the common shapes with no network: `tea 20`, `20 tea`, `+5000 salary`, `auto 80 upi`,
  `lunch 1.5k`, `got 2000 from rahul`, several items separated by commas / "and".
- AI parser (Groq `openai/gpt-oss-20b`, JSON output) for anything the local parser is unsure about — mixed languages,
  messy speech-to-text, dates like "yesterday". Multiple keys rotate on rate limits; models fall back in a chain.
- Voice: browser Web Speech API where it is good (Chrome / Android); Groq Whisper where it is not (iOS, Malayalam/Hindi mix).
- Offline: notes that need the AI are queued and parsed when you are back online.
- Share target: share a bank SMS / UPI notification to the app and it extracts the entry.
- App shortcuts (long-press the icon): Voice add, Quick add, Today.
- Vocabulary: teach your own words ("chaya" → Food, "gpay" → UPI).

**Track**
- Manual add/edit/delete, categories with icons and colours, accounts (Cash / UPI / Bank / Card / Wallet), transfers.
- Transaction list by month with search; calendar heat-map with per-day totals and drill-down.
- Stats: spent / received / net / avg per day, category donut, spent-per-day bars, 6-month income vs expense, top items.
- Printable monthly report (browser Print → Save as PDF).

**Plan**
- Monthly budgets per category or overall, with 80 % / 100 % alerts on the home screen.
- Recurring rules (rent, EMI, salary): auto-add on the day or remind you.
- Lend & borrow tracker with per-person balance and settle-up.

**Data**
- Local-first: IndexedDB (Dexie) is the source of truth; a background engine syncs to Supabase with last-write-wins.
- Export CSV / JSON backup, import CSV / JSON, wipe local data.

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · Serwist PWA · Dexie · Supabase (Postgres + Auth, RLS) ·
Vercel AI SDK with `@ai-sdk/groq` · Recharts · Vitest.

## Run it yourself

1. **Clone and install**
   ```bash
   git clone https://github.com/JasimIhsan/Expense_Tracker.git && cd Expense_Tracker && npm install
   ```
2. **Supabase (optional, for sync and sign-in)**
   - Create a free project at supabase.com.
   - Open the SQL editor and run `supabase/migrations/0001_init.sql`.
   - Authentication → Providers: enable Email (magic link); optionally Google. Add your site URL under URL configuration.
   - Copy the Project URL and anon key from Settings → API into `.env.local` (see `.env.example`):
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without them the app runs device-only.
3. **Groq (optional, for AI and Whisper)**
   - Create one or more free keys at console.groq.com and set `GROQ_API_KEYS=gsk_a,gsk_b` in `.env.local`.
   - Keys are used only by the server route `/api/groq`; the browser never sees them. When one key is rate-limited the
     next is used, and when all fail the next model in the chain is tried. Without keys the app still works with the
     instant local parser and manual entry.
4. **Run**
   ```bash
   npm run dev
   ```
   ```bash
   npm run build && npm start
   ```
   The service worker is only generated in the production build (`next build --webpack`).
   ```bash
   npm test
   ```
5. **Deploy**: any Node host works; Vercel's free tier is the simplest. Install as a PWA from the browser menu.

## Free-tier notes

- Supabase free projects have no expiry: 500 MB database, 2 projects. A project pauses after 7 days without activity
  and resumes with one click (data is kept). Daily use keeps it awake.
- Groq's free tier is rate-limited per key; the app rotates keys and models automatically.

## Project layout

```
app/              routes: / (home + quick add), /add, /transactions, /calendar, /analytics, /report,
                  /budgets, /recurring, /debts, /aliases, /settings, /onboarding, /share, sw.ts, manifest.ts
  api/groq/       server proxy to Groq: injects GROQ_API_KEYS with rotation; /status tells the client if AI is on
components/       QuickAdd, TxnForm, TxnList, BudgetAlerts, DataSection, charts, ui/ (shadcn)
hooks/            live Dexie queries (useData, useBudgets)
lib/db/           Dexie schema, seed, repository helpers
lib/sync/         push/pull engine (dirty flags + updated_at cursors + soft-delete tombstones)
lib/ai/           Groq via AI SDK (client, model fallback), server key pool, prompt + schema, pipeline, offline queue
lib/parse/        local quick-parser (tested)
lib/voice/        hold-to-talk hook (Web Speech / Whisper)
lib/data/         CSV / JSON export and import
lib/recurring.ts  recurring rules engine
supabase/         SQL migrations
```
