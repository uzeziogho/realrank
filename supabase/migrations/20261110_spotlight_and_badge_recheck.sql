-- Spotlight (paid, labelled directory placement — never affects rank) and the
-- periodic badge re-check. Safe to re-run.

alter table public.listed_sites
  add column if not exists spotlight_started_at timestamptz,  -- when the current spotlight run began
  add column if not exists spotlight_until timestamptz,       -- spotlight is live while now() < this
  add column if not exists spotlight_payment_id text,         -- last applied payment (webhook idempotency)
  add column if not exists badge_checked_at timestamptz;      -- last time the badge was re-checked

create index if not exists listed_sites_spotlight_idx
  on public.listed_sites (spotlight_until)
  where is_active and spotlight_until is not null;

create index if not exists listed_sites_badge_checked_idx
  on public.listed_sites (badge_checked_at nulls first)
  where is_active and owner_verified;
