-- ─────────────────────────────────────────────────────────────
-- Remove the seeded placeholder sponsored slots.
--
-- supabase/seed.sql used to insert Semrush (after rank #10) and Ahrefs
-- (after rank #20) as example sponsored placements. Those are competitor
-- promos, not real paid slots, so delete them from any database that ran the
-- seed. Scoped by display_name + site_url so a genuine, hand-added sponsored
-- slot for either brand would not be caught.
--
-- Safe to run more than once; harmless if the seed was never applied.
-- ─────────────────────────────────────────────────────────────

delete from public.sponsored_slots
where (display_name = 'Semrush' and site_url = 'https://www.semrush.com')
   or (display_name = 'Ahrefs'  and site_url = 'https://ahrefs.com');
