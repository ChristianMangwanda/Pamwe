-- Table-level privileges for service_role (the Edge Functions' admin client).
--
-- Companion to 20260708000004_api_role_grants.sql, which granted anon +
-- authenticated but never service_role. That omission was invisible until the
-- 2026-07-09 cutover to project jcyhhxgomhopkoqesbkb: Postgres checks GRANTs
-- before RLS, so every notify-* function's first table read came back
-- "permission denied for table ...". Because those functions discarded the
-- Supabase error object, each one degraded into a bland HTTP 200 and never
-- called Expo. All push was silently dead (nudge, new prayer, partner submit)
-- and ask_pamwe_usage never recorded a row, so rate limiting failed open.
--
-- service_role has rolbypassrls, but BYPASSRLS does not imply table privileges,
-- which is why the role sailed past RLS and still died on the GRANT check.
--
-- Not a security regression: this restores Supabase's own documented default
-- (the supabase_admin default ACL already carries service_role=arwdDxtm).
-- service_role is never exposed to clients; it is the service key held by the
-- Edge Functions only.
--
-- Must run as the table owner (postgres) for ALTER DEFAULT PRIVILEGES to bind.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Future tables/sequences inherit these, so a new table can't silently
-- reintroduce the same gap.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
