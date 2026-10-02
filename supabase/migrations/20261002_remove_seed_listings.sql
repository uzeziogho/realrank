-- ─────────────────────────────────────────────────────────────
-- Remove the curated directory seed.
--
-- The open listing tier now REQUIRES a RealRank badge on the site before a
-- listing is created (see lib/listed.ts). The earlier ~45-row curated seed
-- (supabase/seed-listings.sql, never merged to the app) was unverified
-- placeholder data that no longer fits that model, so delete exactly those
-- rows by host. Scoped to the seed's host list, so a real user submission is
-- never touched — and those famous domains can't be user submissions anyway
-- (createListing blocks already-listed/already-ranked hosts).
--
-- Safe to run more than once. Harmless if the seed was never applied.
-- ─────────────────────────────────────────────────────────────

delete from public.listed_sites
where host in (
  'cal.com','dub.co','resend.com','railway.com','neon.com','turso.tech',
  'trigger.dev','infisical.com','posthog.com','continue.dev','tally.so',
  'typefully.com','beehiiv.com','plausible.io','umami.is','usefathom.com',
  'savvycal.com','loops.so','senja.io','reflect.app','cursor.com',
  'perplexity.ai','elevenlabs.io','ideogram.ai','krea.ai','suno.com',
  'ollama.com','mem.ai','wordware.ai','ghost.org','bearblog.dev','write.as',
  'mataroa.blog','mercury.com','wise.com','ramp.com','lemonsqueezy.com',
  'gumroad.com','payhip.com','fourthwall.com','lemonads.com',
  'indiehackers.com','producthunt.com','peerlist.io','toolfolio.io'
)
and owner_verified = false;  -- never delete a listing that has since been claimed
