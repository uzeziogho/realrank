-- ─────────────────────────────────────────────────────────────
-- OrganicRank database schema + Row Level Security
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
  is_active boolean not null default true,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, site_url)
);

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
