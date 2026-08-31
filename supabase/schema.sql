-- ─────────────────────────────────────────────────────────────
-- RealRank database schema + Row Level Security
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── connected_accounts ────────────────────────────────────────
-- Encrypted Google refresh tokens. NEVER expose to the client: no SELECT
-- policy is granted to end users; only the service role (cron) reads these.
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  google_email text,
  encrypted_refresh_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.connected_accounts enable row level security;

-- Users may see WHETHER they are connected (email/provider), but the token
-- column should never be selected client-side. Keep reads to owner; the app
-- selects only non-secret columns on the client.
drop policy if exists "owner can read own connection metadata" on public.connected_accounts;
create policy "owner can read own connection metadata"
  on public.connected_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "owner can delete own connection" on public.connected_accounts;
create policy "owner can delete own connection"
  on public.connected_accounts for delete
  using (auth.uid() = user_id);

-- Inserts/updates of tokens happen server-side with the service role, which
-- bypasses RLS. No insert/update policy is granted to end users.

-- ── published_sites ───────────────────────────────────────────
create table if not exists public.published_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_url text not null,
  display_name text not null,
  description text,
  category text,
  clicks_7d integer not null default 0,
  clicks_28d integer not null default 0,
  momentum_score numeric not null default 0,
  growth_rate numeric not null default 0,
  previous_momentum_score numeric not null default 0,
  previous_clicks_28d integer not null default 0,
  -- Domain authority (Open PageRank, 0–10). Third-party estimate, refreshed by
  -- the cron; null when unavailable or the OPR key isn't configured.
  domain_rank numeric,
  is_active boolean not null default true,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, site_url)
);

-- Backfill columns on databases created before rank deltas were added.
alter table public.published_sites
  add column if not exists previous_momentum_score numeric not null default 0;
alter table public.published_sites
  add column if not exists previous_clicks_28d integer not null default 0;
alter table public.published_sites
  add column if not exists domain_rank numeric;

alter table public.published_sites enable row level security;

-- PUBLIC READ: the leaderboard is crawlable, so anyone (including anonymous
-- crawlers) can read active sites.
drop policy if exists "anyone can read active published sites" on public.published_sites;
create policy "anyone can read active published sites"
  on public.published_sites for select
  using (is_active = true);

-- Owners manage their own rows.
drop policy if exists "owner can read all own sites" on public.published_sites;
create policy "owner can read all own sites"
  on public.published_sites for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own sites" on public.published_sites;
create policy "owner can insert own sites"
  on public.published_sites for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own sites" on public.published_sites;
create policy "owner can update own sites"
  on public.published_sites for update
  using (auth.uid() = user_id);

drop policy if exists "owner can delete own sites" on public.published_sites;
create policy "owner can delete own sites"
  on public.published_sites for delete
  using (auth.uid() = user_id);

create index if not exists published_sites_momentum_idx
  on public.published_sites (momentum_score desc) where is_active;
create index if not exists published_sites_volume_idx
  on public.published_sites (clicks_28d desc) where is_active;
create index if not exists published_sites_category_idx
  on public.published_sites (category) where is_active;

-- ── site_click_history ────────────────────────────────────────
-- Daily organic-click history per site, backfilled from Search Console's
-- date-dimensioned data. Powers the momentum timeline on /site/[slug] so a
-- site owner can SEE whether a spike (e.g. a pay-to-rank bid) left behind any
-- durable organic growth. One row per (site, day); upserted on refresh.
create table if not exists public.site_click_history (
  site_id uuid not null references public.published_sites(id) on delete cascade,
  date date not null,
  clicks integer not null default 0,
  primary key (site_id, date)
);

alter table public.site_click_history enable row level security;

-- PUBLIC READ: history for active sites is crawlable, like the board itself.
drop policy if exists "anyone can read history of active sites" on public.site_click_history;
create policy "anyone can read history of active sites"
  on public.site_click_history for select
  using (
    exists (
      select 1 from public.published_sites p
      where p.id = site_id and p.is_active
    )
  );

-- Writes happen server-side with the service role (cron), which bypasses RLS.
-- No insert/update policy is granted to end users.

create index if not exists site_click_history_site_date_idx
  on public.site_click_history (site_id, date);

-- ── channels (private revenue attribution) ────────────────────
-- "Channels" = per-founder marketing sources (X, Reddit, a directory, an
-- outbid board…). Each gets a short tracking link; clicks are logged and Stripe
-- revenue is attributed back so a founder can rank channels by what actually
-- pays. This data is PRIVATE to its owner (unlike the public leaderboard).
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,           -- short code used in /go/<slug>
  destination_url text not null,       -- where the link redirects
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.channels enable row level security;

drop policy if exists "owner manages own channels" on public.channels;
create policy "owner manages own channels"
  on public.channels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists channels_user_idx on public.channels (user_id) where not archived;

-- Click events. Inserted by the /go redirect with the SERVICE ROLE (the visitor
-- is anonymous), so no public insert policy. Owners can read their own via the
-- channel join. The row id doubles as the click id passed downstream.
create table if not exists public.channel_clicks (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  referrer text,
  created_at timestamptz not null default now()
);

alter table public.channel_clicks enable row level security;

drop policy if exists "owner reads own clicks" on public.channel_clicks;
create policy "owner reads own clicks"
  on public.channel_clicks for select
  using (exists (select 1 from public.channels c where c.id = channel_id and c.user_id = auth.uid()));

create index if not exists channel_clicks_channel_idx on public.channel_clicks (channel_id, created_at);

-- Attributed conversions. Inserted by the Stripe webhook (service role),
-- idempotent on the Stripe event id. type 'customer' = a paid conversion.
create table if not exists public.channel_conversions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  click_id uuid references public.channel_clicks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_event_id text unique,           -- null for 'signup' events (no Stripe id)
  type text not null default 'customer', -- 'customer' | 'signup'
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);

-- If an earlier version created this column NOT NULL, relax it (signups have no id).
alter table public.channel_conversions alter column stripe_event_id drop not null;

-- One signup per click (idempotent signup beacon).
create unique index if not exists channel_conversions_signup_click_idx
  on public.channel_conversions (click_id) where type = 'signup';

alter table public.channel_conversions enable row level security;

drop policy if exists "owner reads own conversions" on public.channel_conversions;
create policy "owner reads own conversions"
  on public.channel_conversions for select
  using (auth.uid() = user_id);

create index if not exists channel_conversions_channel_idx on public.channel_conversions (channel_id, created_at);

-- Per-user Stripe webhook connection. The signing secret is stored ENCRYPTED
-- (see lib/crypto.ts) and never returned to the client. webhook_token is a
-- random public path segment so /api/attribution/stripe/<token> maps to a user.
create table if not exists public.stripe_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  webhook_token text not null unique,
  encrypted_webhook_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_connections enable row level security;

-- Owner may see WHETHER they're connected (created_at/token), but never the
-- secret column client-side. Inserts/updates happen server-side (service role).
drop policy if exists "owner reads own stripe connection" on public.stripe_connections;
create policy "owner reads own stripe connection"
  on public.stripe_connections for select
  using (auth.uid() = user_id);

drop policy if exists "owner deletes own stripe connection" on public.stripe_connections;
create policy "owner deletes own stripe connection"
  on public.stripe_connections for delete
  using (auth.uid() = user_id);

-- ── sponsored_slots ───────────────────────────────────────────
create table if not exists public.sponsored_slots (
  id uuid primary key default gen_random_uuid(),
  position_after_rank integer not null,
  display_name text not null,
  site_url text not null,
  description text,
  cta_label text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sponsored_slots enable row level security;

-- Public read of active ads; writes are admin-only (service role).
drop policy if exists "anyone can read active sponsored slots" on public.sponsored_slots;
create policy "anyone can read active sponsored slots"
  on public.sponsored_slots for select
  using (is_active = true);
