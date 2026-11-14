-- Unique project names in the directory.
--
-- Two active listings may not share a name that differs only in case, spacing,
-- punctuation or a trailing domain ending ("FormBee", "form-bee", "Formbee.app").
-- The app checks this before every insert/rename (lib/listed.ts → nameKey, which
-- this function mirrors); the unique index below is the backstop for two
-- submissions racing each other.
--
-- Safe to re-run. If duplicates already exist, the index is NOT created and a
-- notice explains why: run `npm run db:dupe-names`, rename or deactivate the
-- extras, then run this file again.

create or replace function public.listing_name_key(name text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
           regexp_replace(lower(btrim(name)), '\.[a-z]{2,12}$', ''),
           '[^[:alnum:]]+', '', 'g'
         )
$$;

do $$
begin
  if exists (
    select 1
    from public.listed_sites
    where is_active and public.listing_name_key(display_name) <> ''
    group by public.listing_name_key(display_name)
    having count(*) > 1
  ) then
    raise notice 'Duplicate listing names exist, so the unique index was not created. Run `npm run db:dupe-names`, rename or deactivate the extras, then run this migration again.';
  else
    create unique index if not exists listed_sites_name_key_idx
      on public.listed_sites (public.listing_name_key(display_name))
      where is_active and public.listing_name_key(display_name) <> '';
  end if;
end $$;
