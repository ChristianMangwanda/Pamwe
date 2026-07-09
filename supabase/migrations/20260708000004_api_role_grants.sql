-- Table-level privileges for the PostgREST API roles.
-- RLS still gates which *rows* each user sees; these grants are the table-level
-- prerequisite PostgREST checks first. On the hosted project these come from
-- Supabase's default-privileges setup; made explicit here so a local
-- `supabase db reset` produces a working API. Idempotent on hosted.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
