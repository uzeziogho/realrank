-- ─────────────────────────────────────────────────────────────
-- Migration: switch Domain Rating to the Ahrefs 0–100 scale (via AnyAPI).
-- Run in the Supabase SQL editor, or via `supabase db push`. Idempotent.
--
-- Adds domain_rank_at so the refresh cron can fetch DR frugally (only sites
-- missing a rating or older than a week — the endpoint is paid and slow), and
-- resets the old Open PageRank (0–10) values so nothing displays on the wrong
-- scale. The cron backfills Ahrefs Domain Rating (0–100) over the next runs.
-- ─────────────────────────────────────────────────────────────

alter table public.published_sites
  add column if not exists domain_rank_at timestamptz;

-- Clear stale 0–10 Open PageRank values; they'll be refetched as 0–100 DR.
update public.published_sites
  set domain_rank = null, domain_rank_at = null
  where domain_rank is not null;
