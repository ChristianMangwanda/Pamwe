-- TEMPORARY, and it exists to be reverted. Christian's call, 2026-08-07.
--
-- The final day of a plan retires it at the mutual submit, and every client up
-- to and including build 23 loses the plan out from under the reveal when that
-- lands (CoupleProvider refreshes, getActiveCouPlan filters on status = 'active',
-- and reveal.tsx falls into its "That plan is finished" branch). The client fix
-- is the plan pinning in useTodayEntry, which ships in build 24.
--
-- Christian and Ammy reach day 7 of 7 tonight, on build 23. Holding the
-- completion back keeps the plan active through their reveal, so the ceremony,
-- the Amen and the completion screen all work on the build they actually have.
--
-- WHAT THIS COSTS while it is paused:
--   • A finished plan stays 'active', so Today keeps offering its last day and
--     the plan is not retired until someone marks it by hand:
--       update public.couple_plans set status = 'completed'
--         where id = '<couple_plan_id>' and status <> 'completed';
--   • finishedRows() filters on status, so a finished-but-unmarked plan does not
--     count toward the Grove until it is marked. (isFinished() itself reads
--     current_day, so nothing is lost, only deferred.)
--   • Enrolling in a new plan completes the previous active one anyway, so a
--     couple who move on are never stuck with two.
--
-- TO REVERT: re-apply 20260714000002_advance_day_on_amen.sql, which is the real
-- definition. Do that once every phone in use is on build 24 or later.

create or replace function public.advance_plan_day_if_mutual_submit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Paused. See the header: the completion branch lives in
  -- 20260714000002_advance_day_on_amen.sql and goes back when b24 has landed.
  return new;
end;
$$;
