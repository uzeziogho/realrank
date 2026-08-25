# Deploying RealRank — step by step

From an empty Supabase project to a live site on Vercel. Follow in order.
Nothing here is destructive; you can stop and resume at any step.

The public values (site URL, Supabase URL, Supabase anon key) are baked into the
code with sensible defaults, so **Vercel only needs these six secrets** — all
with NO `NEXT_PUBLIC_` prefix, so they save without any "Sensitive" prompt drama:

```
SUPABASE_SERVICE_ROLE_KEY     # Part 1  (secret)
GOOGLE_CLIENT_ID              # Part 2
GOOGLE_CLIENT_SECRET          # Part 2  (secret)
GOOGLE_REDIRECT_URI           # Part 2  = https://www.realrank.lol/api/auth/google/callback
TOKEN_ENCRYPTION_KEY          # Part 3  (secret, you generate)
CRON_SECRET                   # Part 3  (secret, you generate)
```

(To point at a different Supabase project or domain later, set the optional
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or
`NEXT_PUBLIC_SITE_URL` — they override the baked-in defaults.)

---

## Part 1 — Supabase (database + auth)

1. **Create a project** at [supabase.com/dashboard](https://supabase.com/dashboard)
   → *New project*. Choose a name, region (near your users), and a database
   password (save it somewhere).

2. **Create the tables + RLS.** Open **SQL Editor → New query**, paste the whole
   of [`supabase/schema.sql`](supabase/schema.sql), and **Run**. Then optionally
   run [`supabase/seed.sql`](supabase/seed.sql) for the sponsored slots.

3. **Copy the API keys.** **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (reveal) → `SUPABASE_SERVICE_ROLE_KEY` *(secret)*

4. **Enable the Google auth provider.** Sign-in is Google-only (one click also
   connects Search Console), so:
   - **Authentication → Providers → Google → Enable.**
   - In **Authorized Client IDs** (or "Client IDs"), paste your Google OAuth
     **Web client ID** (from Part 2) — this lets the app verify Google identity
     tokens. Add the client secret too if the field is shown.
   - If sign-in reports a nonce error, turn on **Skip nonce checks** for Google.
   - **Authentication → URL Configuration → Site URL**: `http://localhost:3000`
     now (your real domain in Part 6). No custom Redirect URLs are needed —
     Google returns to the app's own `/api/auth/google/callback`.

---

## Part 2 — Google Cloud (OAuth + Search Console API)

1. **Create/select a project** at [console.cloud.google.com](https://console.cloud.google.com).

2. **Enable the API.** *APIs & Services → Library* → search **"Google Search
   Console API"** → **Enable**.

3. **OAuth consent screen.** *APIs & Services → OAuth consent screen*:
   - User type **External**.
   - Fill app name, support email, developer email.
   - **Scopes** → add `.../auth/webmasters.readonly`.
   - **Test users** → add your own Google email (needed while the app is in
     *Testing*). Publish the app later to allow anyone.

4. **Create the OAuth client.** *APIs & Services → Credentials → Create
   credentials → OAuth client ID*:
   - Application type **Web application**.
   - **Authorized redirect URIs** — add both:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://realrank.lol/api/auth/google/callback` (add in Part 6)
   - Create, then copy:
     - Client ID → `GOOGLE_CLIENT_ID`
     - Client secret → `GOOGLE_CLIENT_SECRET` *(secret)*

5. Set `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`
   for local dev (must match a redirect URI above exactly).

> The redirect URIs must match **character for character**, including scheme and
> trailing path. Mismatch is the #1 cause of `redirect_uri_mismatch` errors.

---

## Part 3 — Generate app secrets

```bash
# 32-byte key for encrypting Google refresh tokens
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# → TOKEN_ENCRYPTION_KEY

# random secret that protects the cron endpoint
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → CRON_SECRET
```

---

## Part 4 — Run and verify locally

```bash
git pull origin claude/realrank-leaderboard-app-rm6645   # or main, once merged
cp .env.example .env.local          # then fill in all 9 values
npm install
npm run db:check                    # ✓ all four tables present
npm run dev                         # http://localhost:3000
```

Smoke test the full loop:
1. Open `/` — with Supabase connected the board is empty until you publish a
   site (seed data only appears if you run with no Supabase keys at all).
2. Click **Add your site** → **Connect Google Search Console**. One Google
   consent both signs you in and connects GSC → lands on `/dashboard`.
3. **Your verified properties** appear → **Publish** one → real clicks are fetched
   and it shows on the public board.
4. `/stats` shows the Organic Index and movers.

If the Google step fails, check that the Google provider is enabled in Supabase
with your Web client ID (Part 1.4) and that the redirect URI matches exactly.

---

## Part 5 — Deploy to Vercel

1. **Push your code** to GitHub (this repo is already there). Merge your branch
   to `main` when ready, or import the branch directly.

2. **Import the project** at [vercel.com/new](https://vercel.com/new) → pick the
   GitHub repo. Vercel auto-detects Next.js — no build config needed.

3. **Add environment variables** (Project → Settings → Environment Variables) for
   **Production** (and Preview if you want previews to work). Paste all 9, but use
   production values for these two:
   - `NEXT_PUBLIC_SITE_URL=https://realrank.lol`
   - `GOOGLE_REDIRECT_URI=https://realrank.lol/api/auth/google/callback`

4. **Deploy.** You'll get a `*.vercel.app` URL (or attach a custom domain under
   Settings → Domains).

5. **Cron.** [`vercel.json`](vercel.json) schedules `/api/cron/refresh` once daily
   (`0 6 * * *`) — the max frequency the Hobby plan allows. Vercel automatically
   sends your `CRON_SECRET` as a Bearer token, which the route verifies — no extra
   setup.
   > On **Pro** you can refresh more often: change the schedule in `vercel.json`
   > (e.g. `0 */6 * * *`) and bump `refreshCadenceHours` in `lib/config.ts` to match.

---

## Part 6 — Point everything at the real domain

Now that you know the production URL, go back and add it everywhere:

- **Supabase → Auth → URL Configuration**: set **Site URL** to your domain.
- **Google Cloud → Credentials**: add `https://realrank.lol/api/auth/google/callback`
  to Authorized redirect URIs.
- **Vercel env**: confirm `NEXT_PUBLIC_SITE_URL` and `GOOGLE_REDIRECT_URI` use the
  domain, then **redeploy** so the change takes effect.

---

## Part 7 — Post-deploy checks

```bash
# public pages
curl -I https://realrank.lol/                 # 200
curl    https://realrank.lol/robots.txt        # allows /, disallows /dashboard,/api
curl    https://realrank.lol/sitemap.xml       # lists home, /stats, categories

# trigger a data refresh manually (same call Vercel Cron makes)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://realrank.lol/api/cron/refresh      # {"ok":true,...}
```

Then, in the real Google Search Console, add your RealRank domain as a
property and **submit `https://realrank.lol/sitemap.xml`** so Google indexes the
leaderboard.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` | The Google redirect URI must exactly match `GOOGLE_REDIRECT_URI`. Check scheme, host, and `/api/auth/google/callback`. |
| Google sign-in fails / `signin_failed` | Enable the Google provider in Supabase and add your Web **client ID** under Authorized Client IDs; enable "Skip nonce checks" if prompted. |
| Leaderboard is empty | `published_sites` has no active rows — publish a site, or run the demo rows in `seed.sql`. (Seed/"Preview data" only shows when Supabase isn't configured.) |
| `npm run db:check` fails | Keys wrong, or `schema.sql` not run in this project. |
| Cron returns 401 | `CRON_SECRET` not set in Vercel, or mismatched. |
| Google login works but no properties listed | That Google account has no verified Search Console properties, or the app is in Testing and the account isn't a test user. |
```
