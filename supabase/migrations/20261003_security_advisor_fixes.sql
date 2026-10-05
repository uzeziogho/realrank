-- ─────────────────────────────────────────────────────────────
-- Supabase security-advisor fixes.
-- Run in the Supabase SQL editor. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- 1) function_search_path_mutable (0011) — pin an explicit search_path on the
--    analytics bump_* RPCs. Each one fully-qualifies every table it touches and
--    uses only pg_catalog built-ins, so an empty search_path is safe and is the
--    hardened choice (nothing resolves through a user-controlled schema).
alter function public.bump_site_traffic(boolean, boolean)        set search_path = '';
alter function public.bump_traffic_breakdown(text, text, text, text) set search_path = '';
alter function public.bump_event(text, text)                     set search_path = '';
alter function public.bump_outbound_click(text)                  set search_path = '';

-- 2) anon|authenticated_security_definer_function_executable (0028/0029) —
--    handle_new_user() is a SECURITY DEFINER trigger on auth.users, not an API
--    endpoint. Revoke the RPC EXECUTE grants so it can't be called via
--    /rest/v1/rpc; the trigger still fires (it runs as its definer/owner).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 3) auth_leaked_password_protection is NOT fixable in SQL. Enable it in the
--    Supabase dashboard: Authentication → Policies → Password protection →
--    turn on "Leaked password protection" (checks HaveIBeenPwned).
