-- ---------------------------------------------------------------------------
-- Classify bot traffic instead of discarding it.
--
-- Until now /api/pulse dropped suspected bots entirely, so the public counters
-- were human-only but the bot share was unknowable. This keeps the hit and
-- counts it separately, with a reason label, so the owner dashboard can report
-- what was filtered and the public figures stay human-only.
--
-- Deliberately additive: `bump_site_traffic` is NOT touched, so its 2-argument
-- signature stays exactly as the running app calls it. Adding a defaulted
-- parameter to it would have created an overload that makes every existing
-- 2-argument call ambiguous, breaking live traffic between the migration and
-- the deploy. A separate function for the bot path avoids that entirely, so
-- this migration and the app deploy are safe in either order.
--
-- Existing rows need no backfill: bots were dropped before this, so the
-- historical visitors/sessions/pageviews columns were already human-only, and
-- the new bot columns correctly start at zero.
-- ---------------------------------------------------------------------------

alter table public.site_traffic_daily
  add column if not exists bot_visitors  bigint not null default 0,
  add column if not exists bot_sessions  bigint not null default 0,
  add column if not exists bot_pageviews bigint not null default 0;

-- Atomic increment for one hit classified as automated. Mirrors
-- bump_site_traffic, but writes the bot_* columns and additionally records the
-- deciding signal under the 'bot_reason' breakdown dimension so the dashboard
-- can show *why* traffic was filtered, not just how much.
create or replace function public.bump_bot_traffic(
  new_visitor boolean,
  new_session boolean,
  p_reason text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  d date := (now() at time zone 'utc')::date;
begin
  insert into public.site_traffic_daily as t
    (day, bot_visitors, bot_sessions, bot_pageviews, updated_at)
  values (
    d,
    case when new_visitor then 1 else 0 end,
    case when new_session then 1 else 0 end,
    1,
    now()
  )
  on conflict (day) do update set
    bot_visitors  = t.bot_visitors  + excluded.bot_visitors,
    bot_sessions  = t.bot_sessions  + excluded.bot_sessions,
    bot_pageviews = t.bot_pageviews + excluded.bot_pageviews,
    updated_at = now();

  if p_reason is not null and length(trim(p_reason)) > 0 then
    insert into public.site_traffic_breakdown as b (day, dimension, label, hits, updated_at)
    values (d, 'bot_reason', left(trim(p_reason), 128), 1, now())
    on conflict (day, dimension, label) do update set
      hits = b.hits + 1,
      updated_at = now();
  end if;
end;
$$;
