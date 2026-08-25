-- ─────────────────────────────────────────────────────────────
-- RealRank seed data (optional)
-- Run AFTER schema.sql, in the Supabase SQL editor.
--
-- Purpose: give a freshly-linked database something to render so you can
-- confirm the app is reading from Postgres (not the built-in seed fallback).
-- ─────────────────────────────────────────────────────────────

-- ── Sponsored placements (real ads you'd actually want to keep) ──
-- Injected after organic rank #10 and #20 by the app.
insert into public.sponsored_slots
  (position_after_rank, display_name, site_url, description, cta_label, is_active)
values
  (10, 'Semrush', 'https://www.semrush.com',
   'See every keyword your competitors rank for. Free 7-day trial.', 'Try free', true),
  (20, 'Ahrefs', 'https://ahrefs.com',
   'Grow your search traffic with the industry-standard SEO toolset.', 'Start now', true)
on conflict do nothing;

-- ── Optional: demo leaderboard rows (TEST DATA — delete after verifying) ──
-- These let you see live rows immediately. `user_id` uses the all-zero UUID,
-- which need not exist in auth.users for a public read. Remove them once your
-- real Google Search Console pipeline is publishing sites.
--
-- To verify the link: uncomment, run, then load the homepage — the "Preview
-- data" badge should disappear and these rows should appear. Then delete them:
--   delete from public.published_sites where user_id = '00000000-0000-0000-0000-000000000000';
--
-- insert into public.published_sites
--   (user_id, site_url, display_name, description, category,
--    clicks_7d, clicks_28d, momentum_score, growth_rate, is_active, last_refreshed_at)
-- values
--   ('00000000-0000-0000-0000-000000000000', 'https://example-fast.com', 'Example Fast',
--    'Demo row — delete me.', 'saas', 4200, 8000, 780.0, 2.3, true, now()),
--   ('00000000-0000-0000-0000-000000000000', 'https://example-big.com', 'Example Big',
--    'Demo row — delete me.', 'media', 9000, 40000, 410.0, 0.05, true, now());
