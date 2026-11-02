-- Owner claim-and-edit + structured profile fields for listings.
--
-- Structured fields enrich a listing's profile (and power pricing/platform
-- filters later). The claim columns let a logged-in user prove they control the
-- domain — by placing a one-time secret code on the site — and then edit their
-- own listing. All writes go through the service role in lib/listed.ts; the
-- table still has no open insert/update policy.

alter table public.listed_sites
  -- Structured profile fields (all optional).
  add column if not exists pricing text,                       -- free | freemium | paid | open_source
  add column if not exists platforms text[] not null default '{}',
  add column if not exists details text,
  -- Claim / ownership.
  add column if not exists claimed_by uuid references auth.users(id) on delete set null,
  add column if not exists claim_code text,                    -- pending secret, cleared once claimed
  add column if not exists claim_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists claim_requested_at timestamptz;

-- Who owns which listing, for the "my listings" lookup on the dashboard.
create index if not exists listed_sites_claimed_by_idx on public.listed_sites (claimed_by);
