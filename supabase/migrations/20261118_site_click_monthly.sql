-- Monthly click totals per site, for the monthly "fastest-growing websites"
-- snapshot pages (/best/fastest-growing/YYYY-MM). Summing in the database means
-- the page reads one row per site per month instead of every daily row.
-- security_invoker: the view obeys site_click_history's own row-level security
-- (public read for active sites only); the server reads it with the service role.

create or replace view public.site_click_monthly
with (security_invoker = true) as
select
  site_id,
  date_trunc('month', date)::date as month,
  sum(clicks)::bigint as clicks,
  count(*)::int as days
from public.site_click_history
group by site_id, date_trunc('month', date);
