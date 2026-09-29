-- ─────────────────────────────────────────────────────────────
-- Directory seed: curated, UNVERIFIED listings for the open tier.
--
-- Bootstraps the /listed directory so a first-time visitor sees a living
-- board instead of a ghost town. These are real, public products commonly
-- found in maker directories; they seed the UNVERIFIED tier only
-- (status='listed', owner_verified=false), so their profiles are noindex and
-- their outbound links are nofollow — nothing here claims a verified rank.
-- The verified momentum board (published_sites) is NEVER seeded: real GSC
-- clicks are the only thing that puts a site there.
--
-- Idempotent (ON CONFLICT (host) DO NOTHING) — safe to run more than once,
-- and it never overwrites a real submission. Opt-out: delete any row on
-- request. Run AFTER 20260928_listed_sites.sql.
-- ─────────────────────────────────────────────────────────────

insert into public.listed_sites (host, site_url, display_name, tagline, category, status, owner_verified, is_active)
values
  ('cal.com', 'https://cal.com', 'Cal.com', 'Open-source scheduling infrastructure for everyone.', 'developer-tools', 'listed', false, true),
  ('dub.co', 'https://dub.co', 'Dub', 'Open-source link management for modern marketing teams.', 'developer-tools', 'listed', false, true),
  ('resend.com', 'https://resend.com', 'Resend', 'The email API for developers.', 'developer-tools', 'listed', false, true),
  ('railway.com', 'https://railway.com', 'Railway', 'Deploy apps and databases without the infrastructure headache.', 'developer-tools', 'listed', false, true),
  ('neon.com', 'https://neon.com', 'Neon', 'Serverless Postgres with branching.', 'developer-tools', 'listed', false, true),
  ('turso.tech', 'https://turso.tech', 'Turso', 'SQLite for production, at the edge.', 'developer-tools', 'listed', false, true),
  ('trigger.dev', 'https://trigger.dev', 'Trigger.dev', 'Open-source background jobs for TypeScript.', 'developer-tools', 'listed', false, true),
  ('infisical.com', 'https://infisical.com', 'Infisical', 'Open-source secret management for teams.', 'developer-tools', 'listed', false, true),
  ('posthog.com', 'https://posthog.com', 'PostHog', 'Product analytics, session replay and feature flags in one.', 'developer-tools', 'listed', false, true),
  ('continue.dev', 'https://continue.dev', 'Continue', 'Open-source AI code assistant for your IDE.', 'developer-tools', 'listed', false, true),

  ('tally.so', 'https://tally.so', 'Tally', 'The simplest way to create forms, free.', 'saas', 'listed', false, true),
  ('typefully.com', 'https://typefully.com', 'Typefully', 'Write, schedule and grow on X and LinkedIn.', 'saas', 'listed', false, true),
  ('beehiiv.com', 'https://beehiiv.com', 'beehiiv', 'The newsletter platform built for growth.', 'saas', 'listed', false, true),
  ('plausible.io', 'https://plausible.io', 'Plausible Analytics', 'Simple, privacy-friendly web analytics.', 'saas', 'listed', false, true),
  ('umami.is', 'https://umami.is', 'Umami', 'Open-source, privacy-focused web analytics.', 'saas', 'listed', false, true),
  ('usefathom.com', 'https://usefathom.com', 'Fathom Analytics', 'Privacy-first website analytics, no cookies.', 'saas', 'listed', false, true),
  ('savvycal.com', 'https://savvycal.com', 'SavvyCal', 'Scheduling that respects everyone''s time.', 'saas', 'listed', false, true),
  ('loops.so', 'https://loops.so', 'Loops', 'Email for modern SaaS companies.', 'saas', 'listed', false, true),
  ('senja.io', 'https://senja.io', 'Senja', 'Collect, manage and share testimonials.', 'saas', 'listed', false, true),
  ('reflect.app', 'https://reflect.app', 'Reflect', 'A note-taking app that mirrors the way you think.', 'saas', 'listed', false, true),

  ('cursor.com', 'https://cursor.com', 'Cursor', 'The AI code editor.', 'ai', 'listed', false, true),
  ('perplexity.ai', 'https://perplexity.ai', 'Perplexity', 'Where knowledge begins — an AI answer engine.', 'ai', 'listed', false, true),
  ('elevenlabs.io', 'https://elevenlabs.io', 'ElevenLabs', 'Lifelike AI voice generation.', 'ai', 'listed', false, true),
  ('ideogram.ai', 'https://ideogram.ai', 'Ideogram', 'AI image generation with reliable text.', 'ai', 'listed', false, true),
  ('krea.ai', 'https://krea.ai', 'Krea', 'Real-time AI image and video generation.', 'ai', 'listed', false, true),
  ('suno.com', 'https://suno.com', 'Suno', 'Make any song you can imagine with AI.', 'ai', 'listed', false, true),
  ('ollama.com', 'https://ollama.com', 'Ollama', 'Run large language models locally.', 'ai', 'listed', false, true),
  ('mem.ai', 'https://mem.ai', 'Mem', 'The AI notes app that organizes itself.', 'ai', 'listed', false, true),
  ('wordware.ai', 'https://wordware.ai', 'Wordware', 'Build AI agents with a document editor.', 'ai', 'listed', false, true),

  ('ghost.org', 'https://ghost.org', 'Ghost', 'Independent publishing for creators.', 'media', 'listed', false, true),
  ('bearblog.dev', 'https://bearblog.dev', 'Bear Blog', 'A fast, minimal, privacy-first blogging platform.', 'media', 'listed', false, true),
  ('write.as', 'https://write.as', 'Write.as', 'Distraction-free, privacy-focused writing.', 'media', 'listed', false, true),
  ('mataroa.blog', 'https://mataroa.blog', 'Mataroa', 'Naked blogging platform for minimalists.', 'media', 'listed', false, true),

  ('mercury.com', 'https://mercury.com', 'Mercury', 'Banking built for startups.', 'finance', 'listed', false, true),
  ('wise.com', 'https://wise.com', 'Wise', 'International money transfers at the real rate.', 'finance', 'listed', false, true),
  ('ramp.com', 'https://ramp.com', 'Ramp', 'Corporate cards and spend management.', 'finance', 'listed', false, true),
  ('lemonsqueezy.com', 'https://lemonsqueezy.com', 'Lemon Squeezy', 'Payments and subscriptions as a merchant of record.', 'finance', 'listed', false, true),

  ('gumroad.com', 'https://gumroad.com', 'Gumroad', 'Sell digital products to your audience.', 'ecommerce', 'listed', false, true),
  ('payhip.com', 'https://payhip.com', 'Payhip', 'Sell digital downloads, memberships and courses.', 'ecommerce', 'listed', false, true),
  ('fourthwall.com', 'https://fourthwall.com', 'Fourthwall', 'Everything creators need to sell to fans.', 'ecommerce', 'listed', false, true),
  ('lemonads.com', 'https://lemonads.com', 'Lemonads', 'Sell ad slots on your site without middlemen.', 'ecommerce', 'listed', false, true),

  ('indiehackers.com', 'https://indiehackers.com', 'Indie Hackers', 'Where founders share what''s working.', 'marketplace', 'listed', false, true),
  ('producthunt.com', 'https://producthunt.com', 'Product Hunt', 'The best new products in tech.', 'marketplace', 'listed', false, true),
  ('peerlist.io', 'https://peerlist.io', 'Peerlist', 'A professional network for people in tech.', 'marketplace', 'listed', false, true),
  ('toolfolio.io', 'https://toolfolio.io', 'Toolfolio', 'A curated directory of tools for makers.', 'marketplace', 'listed', false, true)
on conflict (host) do nothing;
