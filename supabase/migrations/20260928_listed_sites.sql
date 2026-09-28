-- ─────────────────────────────────────────────────────────────
-- Migration: open "$0 listing" tier (listed_sites)
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- Idempotent: safe to run more than once.
--
-- The free, unverified directory tier: anyone can list a project without
-- connecting Search Console. Kept in its OWN table (never mixed into
-- published_sites, which is user-owned and GSC-verified) so the ranked
-- momentum board stays verified-only. Listed rows show on a separate /listed
-- board; their profiles/outbound links are noindex/nofollow until ownership is
-- proven — by embedding the RealRank badge (owner_verified) or by connecting
-- Search Console (which promotes the site into published_sites). Inserts happen
-- ONLY through /api/list with the service role, so there is no open RLS insert.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.listed_sites (
  id uuid primary key default gen_random_uuid(),
  host text not null unique,
  site_url text not null,
  display_name text not null,
  tagline text,
  description text,
  category text,
  submitter_email text,
  status text not null default 'listed',
  owner_verified boolean not null default false,
  verified_at timestamptz,
  is_active boolean not null default true,
  submitted_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listed_sites enable row level security;

drop policy if exists "anyone can read active listed sites" on public.listed_sites;
create policy "anyone can read active listed sites"
  on public.listed_sites for select
  using (is_active = true);

create index if not exists listed_sites_created_idx
  on public.listed_sites (created_at desc) where is_active;
create index if not exists listed_sites_category_idx
  on public.listed_sites (category) where is_active;
create index if not exists listed_sites_verified_idx
  on public.listed_sites (owner_verified) where is_active;
