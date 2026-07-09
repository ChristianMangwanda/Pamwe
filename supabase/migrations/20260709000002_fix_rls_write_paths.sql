-- P0 fixes from the 2026-07-09 debug tour (debug-tour-2026-07-09.md #1, #2, #4).
--
-- #1/#2: Both UPDATE policies below had USING but no WITH CHECK. Postgres then
-- applies the USING expression to the NEW row as well, which forbids the very
-- transition each policy exists to allow:
--   - submitting a draft sets submitted_at, but the reused USING requires it NULL
--   - joining a couple sets partner_b_id, but the reused USING requires it NULL
-- Empirically reproduced under the authenticated role: both UPDATEs fail with
-- "new row violates row-level security policy". Locally this was masked because
-- the dev seed pairs via the service role and no entry had ever been submitted
-- through the app.

alter policy entries_update_own_draft on public.entries
  with check (user_id = (select auth.uid()));

alter policy couples_update_join on public.couples
  with check (
    partner_b_id = (select auth.uid())
    and partner_a_id <> (select auth.uid())
  );

-- #4: exactly one active plan per couple, enforced by the DB. The old
-- UNIQUE(couple_id, plan_id) was dropped for retakes (20260709000001); this
-- partial index is the constraint the schema actually wanted. Client code
-- assumes a single active row (getActiveCouPlan .single()), and a second
-- active row previously caused an unrecoverable enroll loop.
create unique index if not exists couple_plans_one_active
  on public.couple_plans (couple_id)
  where (status = 'active');
