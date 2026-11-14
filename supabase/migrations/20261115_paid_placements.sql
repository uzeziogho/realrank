-- Paid placements: Sponsor subscriptions, the Spotlight payment ledger, buyer
-- email bookkeeping — and a privacy fix for listed_sites.
--
-- Safe to re-run (every statement is idempotent).

-- ── Privacy fix ─────────────────────────────────────────────────────────────
-- listed_sites had a public row-level read policy, so the anon key (which ships
-- to every browser) could read EVERY column of active listings — including
-- submitter_email, submitted_ip and claim codes. The app reads this table only
-- server-side with the service role, so public read access is removed entirely.
revoke select on public.listed_sites from anon, authenticated;

-- ── Sponsor slots ↔ Dodo subscriptions ──────────────────────────────────────
-- Display fields stay on sponsored_slots (public board data). Billing state and
-- the customer's email live in sponsor_subscriptions, which is service-role only.
alter table public.sponsored_slots
  add column if not exists subscription_id text,
  -- active | needs_details | waitlist | paused | cancelled | on_hold | ended
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists sponsored_slots_subscription_idx
  on public.sponsored_slots (subscription_id) where subscription_id is not null;

create table if not exists public.sponsor_subscriptions (
  subscription_id text primary key,
  slot_id uuid references public.sponsored_slots (id) on delete set null,
  customer_email text,
  status text not null default 'active',
  -- The end of the period the customer has paid for (Dodo's next billing date).
  paid_through timestamptz,
  cancelled_at timestamptz,
  last_event text,
  last_event_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sponsor_subscriptions enable row level security;
-- No policies on purpose: only the service role (server) reads or writes it.

-- ── Spotlight payment ledger ────────────────────────────────────────────────
-- One row per paid (or admin-granted) Spotlight run, so a refund can end or
-- shorten exactly the days it paid for, and emails know who bought it.
create table if not exists public.spotlight_payments (
  payment_id text primary key,
  host text not null,
  days integer not null,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists spotlight_payments_host_idx on public.spotlight_payments (host, created_at desc);
alter table public.spotlight_payments enable row level security;
-- No policies on purpose: service role only.

-- ── Buyer email bookkeeping on listings ─────────────────────────────────────
-- The spotlight_until a reminder / results email was sent for, so each run gets
-- one of each and an extension (new end date) gets its own.
alter table public.listed_sites
  add column if not exists spotlight_reminded_for timestamptz,
  add column if not exists spotlight_reported_for timestamptz;
