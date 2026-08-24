# OrganicRank

**Connect your sites. We verify the clicks. Real growth decides the order.**

A public, fully crawlable organic-traffic leaderboard. Sites connect Google
Search Console (read-only), publish their verified properties, and get ranked by
**Momentum** (growth velocity) — so fast-growing sites can compete with the
giants — with a toggle to pure **Volume**.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + shadcn/ui-style components
- **Supabase** (Auth + Postgres + Row Level Security)
- **Google OAuth 2.0** (`webmasters.readonly`) via **googleapis**
- **Vercel** hosting + Cron
- **Zod** for validation

## Momentum score

```
recent   = clicks_7d / 7
prior    = (clicks_28d − clicks_7d) / 21
growth   = (recent − prior) / prior
momentum = (1 + growth) × log10(clicks_7d + 1) × 100
```

Growth velocity, weighted logarithmically by volume, so neither tiny noise nor
raw size dominates. See `lib/momentum.ts`.

## Project layout

```
app/
  page.tsx                     # Server-rendered leaderboard (ISR 1h) + JSON-LD
  about/                       # How it works + momentum explainer
  category/[slug]/             # Per-category leaderboards (crawlable, in sitemap)
  dashboard/                   # Connect GSC + manage published sites (noindex)
  privacy/, terms/             # Legal stubs
  robots.ts, sitemap.ts        # SEO
  api/
    auth/google/start          # Begin OAuth consent (CSRF state cookie)
    auth/google/callback       # Exchange code, encrypt + store refresh token
    cron/refresh               # Vercel Cron: refetch clicks, rescore, revalidate
components/
  leaderboard.tsx              # Organic + sponsored rows
  ranking-toggle.tsx           # Momentum / Volume switch (URL param)
  json-ld.tsx, site-header.tsx, site-footer.tsx, ui/*
lib/
  momentum.ts                  # Scoring
  ranking.ts                   # Sort + sponsored injection (after #10 and #20)
  data.ts                      # Leaderboard data source (Supabase or seed data)
  dummy-data.ts                # Realistic seed data
  google.ts                    # GSC OAuth + Search Analytics helpers
  crypto.ts                    # AES-256-GCM token encryption
  supabase/                    # Browser/server/service clients + types
  config.ts                    # Brand, tagline, categories (rename here)
supabase/schema.sql            # Tables + RLS policies
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev
```

The app renders end-to-end with **seed data** before any credentials are set, so
you can develop the UI immediately. Real data activates once Supabase + Google
are configured.

### Environment

See `.env.example`. Generate the token key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Supabase

1. Create a project.
2. Run `supabase/schema.sql` in the SQL editor (creates tables + RLS).
3. Copy the URL, anon key, and service-role key into `.env.local`.

### Google OAuth

1. Create OAuth credentials (Web application) in Google Cloud.
2. Add the redirect URI `<SITE_URL>/api/auth/google/callback`.
3. Enable the **Search Console API** and add the `webmasters.readonly` scope.

### Cron

`vercel.json` schedules `/api/cron/refresh` every 6 hours. Set `CRON_SECRET` in
Vercel — the route rejects any call without `Authorization: Bearer $CRON_SECRET`.

## Security

- Refresh tokens are AES-256-GCM encrypted and **never** sent to the client.
- RLS: the leaderboard is publicly readable; tokens are service-role only.
- The public leaderboard is server-rendered — works for logged-out users and
  crawlers, with `ItemList` JSON-LD, canonical tags, `robots.ts`, and `sitemap.ts`.

## Build order (MVP)

1. ✅ Scaffolding + schema + types
2. ✅ Server-rendered leaderboard w/ Momentum/Volume toggle (seed data)
3. ✅ Sponsored slot injection
4. ✅ Dashboard shell + SEO (robots/sitemap/metadata)
5. ⏭️ Wire live Google OAuth + real GSC pipeline (routes scaffolded)
6. ⏭️ Property selection writes + email auth UI
