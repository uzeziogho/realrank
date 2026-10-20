-- Suppression list for the weekly Movers digest.
--
-- An address lands here when someone clicks the unsubscribe link in a digest
-- (see /api/unsubscribe). It is checked at send time, so a row here means that
-- address never receives another digest, whichever list it came from — the
-- waitlist or a listing's submitter email.
--
-- Kept as its own table rather than a flag on waitlist, because the digest can
-- also go to listing submitters, and one opt-out has to cover the person, not
-- the row that happened to hold their address.

create table if not exists public.email_unsubscribes (
  email text primary key,
  -- Where the opt-out came from, for triage only ("digest", "manual", ...).
  source text,
  created_at timestamptz not null default now()
);

alter table public.email_unsubscribes enable row level security;

-- No policies: reads and writes happen server-side with the service role.
-- An opt-out list must never be publicly readable — it is a list of real
-- addresses, and leaking it would be worse than the mail it suppresses.
