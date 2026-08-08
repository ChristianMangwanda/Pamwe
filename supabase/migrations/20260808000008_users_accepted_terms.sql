-- The privacy policy says the legal basis for holding a couple's reflections is
-- their explicit consent, "given when you create an account". Nothing recorded
-- that: the welcome screen went straight to sign-in, and no column existed to
-- say when, or to what, anyone agreed.
--
-- One nullable timestamp. The app writes it once, the first time a signed-in user
-- has none, so the claim in the policy is a fact about a row rather than a
-- sentence in a document.

alter table public.users add column if not exists accepted_terms_at timestamptz;

-- Extends the column list in 20260808000002: the client may set this, and only
-- this, in addition to its own profile and notification columns.
grant update (accepted_terms_at) on public.users to authenticated;
