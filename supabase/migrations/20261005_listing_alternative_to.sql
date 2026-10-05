-- ─────────────────────────────────────────────────────────────
-- Listings: "alternative to" tag.
--
-- Lets a listed project declare the established tool it's a free/indie
-- alternative to (e.g. "Notion"). Powers the /alternatives-to/<tool>
-- programmatic directory pages. Optional, free text, nullable.
-- Safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.listed_sites add column if not exists alternative_to text;
