-- Webhook delivery log + admin notifications (both service-role only).
-- Safe to re-run.

-- Every Dodo webhook delivery, including rejected ones, so "did the event
-- arrive, and what happened to it?" has an answer on /admin/placements.
create table if not exists public.webhook_events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  delivery_id text,
  event_type text,
  http_status integer not null,
  outcome text,
  error text,
  -- Ids and field names only (no customer emails), enough to debug a payload shape.
  summary jsonb
);
create index if not exists webhook_events_received_idx on public.webhook_events (received_at desc);
alter table public.webhook_events enable row level security;

-- Things that need the owner: shown behind the bell on the dashboard, and
-- also emailed when Resend is configured.
create table if not exists public.admin_notifications (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'info',   -- info | warning | money
  title text not null,
  body text,
  link text,
  read_at timestamptz
);
create index if not exists admin_notifications_unread_idx on public.admin_notifications (created_at desc) where read_at is null;
alter table public.admin_notifications enable row level security;
-- No policies on either table: only the server (service role) reads or writes.
