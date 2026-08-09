-- Row level security does not apply to TRUNCATE, and the API roles had it.
--
-- Found by writing a probe for search_verses: the natural way to assert
-- "Scripture is read-only" is to try to write it, and while the UPDATE was
-- correctly refused (bible_verses has a SELECT policy and nothing else), the
-- table-level grant list turned out to read
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- for both anon and authenticated, on all 22 tables in the schema, locally and
-- on hosted.
--
-- DELETE and UPDATE are fine: those are row operations, so RLS governs them and
-- a table with no matching policy simply changes nothing. TRUNCATE is not a row
-- operation. Postgres checks the table privilege and nothing else, so
-- `truncate public.entries` from the `authenticated` role empties every
-- reflection every couple has ever written, policies and all. Verified locally:
-- 31,103 verses to zero inside one transaction, then rolled back.
--
-- Reachability today is low, and worth stating plainly rather than overselling
-- this: PostgREST has no TRUNCATE verb, so the API cannot ask for it. What this
-- closes is the gap between "our policies say no" and "the database says no",
-- which is the same belt-and-braces reasoning 20260808000001 used when it
-- revoked insert and update on couples after dropping their policies.
--
-- 20260708000004 is not the culprit: it grants exactly SELECT, INSERT, UPDATE,
-- DELETE. These three come from Supabase's own bootstrap, which does a
-- `grant all` to the API roles, so they arrive on any new project and on every
-- new table unless the default privileges are changed too.

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- And for tables that do not exist yet, so the next migration does not quietly
-- reintroduce this. Written for both roles that can own a table here.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

-- Deliberately NO compensating `grant select, insert, update, delete on all
-- tables`. The first draft of this migration ended with one, for tidiness, and
-- the probe caught it in the next run: a blanket grant undoes every narrowing
-- that came before it. It re-granted whole-table UPDATE on public.users, which
-- 20260808000002 had cut down to nine columns precisely because couple_id was a
-- forged identity; it re-granted UPDATE on public.entries, undoing the
-- reveal_seen_at column grant; and it handed back the INSERT and UPDATE on
-- public.couples and public.push_tokens that were revoked on purpose.
--
-- The privileges those roles need are already granted by 20260708000004 and
-- narrowed by the migrations after it. This file only takes away.
