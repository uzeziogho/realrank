-- Comeback emails: the weekly report to site owners, rank-move alerts, and the
-- weekly visits report for directory listings (lib/comeback.ts).

-- What each verified site was last told, so "up 3 places since last week" and
-- "you're on the board" compare against the right baseline. A site's first
-- sighting only records a baseline and sends nothing.
create table if not exists public.owner_email_state (
  site_id uuid primary key references public.published_sites(id) on delete cascade,
  alert_rank integer,              -- rank at the last alert or baseline (null = no clicks yet)
  alerted_at timestamptz,
  weekly_rank integer,             -- rank shown in the last weekly report
  weekly_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One row per email sent. The unique key makes a weekly send idempotent: a
-- retried cron can't mail the same report twice in one week.
create table if not exists public.email_log (
  id bigserial primary key,
  kind text not null,              -- owner_weekly | owner_alert | listing_weekly
  recipient text not null,
  subject_key text not null,       -- user id (owner) or host (listing)
  period text not null,            -- ISO week for weekly kinds; date + reason for alerts
  sent_at timestamptz not null default now()
);

create unique index if not exists email_log_once_idx on public.email_log (kind, subject_key, period);
create index if not exists email_log_recent_idx on public.email_log (sent_at desc);

-- Service-role only: both tables hold addresses or account-level state.
alter table public.owner_email_state enable row level security;
alter table public.email_log enable row level security;
