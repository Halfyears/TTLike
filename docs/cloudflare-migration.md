# TTLike Cloudflare Migration

This repo is being moved from Vercel + Supabase to Cloudflare Workers + D1 + R2 + KV + Queues/Cron while keeping the current app surface, third-party APIs, and AI provider flow.

## Target Cloudflare Stack

- Workers + OpenNext: full-stack Next.js runtime for App Router, API routes, SSR, and proxy.
- D1: primary SQL store replacing Supabase Postgres/PostgREST.
- R2: permanent TikTok cover cache replacing Supabase Storage.
- KV: low-latency cache and session metadata.
- Queues + Cron Triggers: background ingestion and scheduled TikTok refresh jobs.
- Workers Builds or GitHub Actions: deployment path replacing Vercel.

## Current Migration State

- Added `@opennextjs/cloudflare`, `wrangler`, `wrangler.jsonc`, and `open-next.config.ts`.
- Added a D1-compatible schema at `cloudflare/d1/schema.sql`.
- Added Supabase export and D1 import SQL generators under `scripts/cloudflare/`.
- Added `.dev.vars.example` without Vercel or Supabase deployment variables.
- Migrated the shared cover cache helper to R2-first storage with a Supabase fallback.
- Added `/api/assets/covers/[...path]` to serve R2 cover objects without requiring an R2 custom domain.
- Migrated `app/sitemap.ts` to D1-first reads with a Supabase REST fallback.
- Migrated product detail reads to D1-first queries with a Supabase REST fallback.
- Migrated product listing pagination/filter reads to D1-first queries with a Supabase fallback.

The application code still has many Supabase Auth/PostgREST/Storage calls. Those must be replaced before removing `@supabase/*` packages.

## Resource Setup

```bash
npm install
npm run cf:typegen
npm run cf:d1:schema
```

Create Cloudflare resources and add their generated IDs to `wrangler.jsonc`:

```bash
wrangler d1 create ttlike
wrangler r2 bucket create ttlike-covers
wrangler kv namespace create TTLIKE_KV
wrangler kv namespace create TTLIKE_SESSIONS
wrangler queues create ttlike-jobs
```

Then run:

```bash
npm run cf:typegen
npm run cf:d1:schema
```

Secrets are configured with `wrangler secret put NAME`; keep `.dev.vars` for local preview only.

## Data Export From Old Supabase

Create a local `.dev.vars` or shell environment with:

```bash
OLD_SUPABASE_URL=https://your-project.supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then run:

```bash
npm run cf:export:supabase
npm run cf:d1:import-sql
wrangler d1 execute ttlike --file=cloudflare/d1/import-data.sql
```

The generated export folder and import SQL contain production data and are ignored by Git.

## Important Auth Note

Supabase public Admin API does not reliably expose reusable password hashes for all auth methods. Preserve `auth_users` IDs, emails, metadata, and provider state, then migrate users through Google OAuth re-linking or a password reset flow. If direct database access to Supabase `auth.users` is available, export `encrypted_password` for archival continuity, but verify hashes before enabling password login.

## Remaining Code Migration

1. Replace `lib/supabase/*` with a D1-backed server data layer and browser API clients.
2. Replace Supabase Auth pages with Cloudflare/D1 sessions and Google OAuth callbacks.
3. Replace remaining inline Supabase Storage calls in scraper routes with `cacheCoverImage`.
4. Move scheduled scraper workflow from GitHub Actions to Workers Cron or Queues.
5. Decide whether Trigger.dev remains as a third-party workflow provider or gets replaced by Cloudflare Queues/Workflows.
6. Remove `.vercel`, Supabase env vars, Supabase migrations, and `@supabase/*` packages only after the replacement paths pass preview tests.

## Verification

Use `npm run preview` for production-like Cloudflare `workerd` testing, not only `npm run dev`.
