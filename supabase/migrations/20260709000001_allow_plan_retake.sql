-- Allow a couple to re-take a plan they've completed.
--
-- Each enrollment is its own couple_plans row: entries carry a UNIQUE
-- (couple_plan_id, day_number, user_id), so reusing a row would collide with
-- (and destroy) the first run's reflections. A fresh row per run preserves
-- history (reflections.ts already reads across all of a couple's enrollments).
-- The UNIQUE(couple_id, plan_id) constraint made that second enrollment
-- impossible — drop it. "One active plan at a time" is still enforced by
-- switchPlan completing actives before inserting.
alter table public.couple_plans
  drop constraint if exists couple_plans_couple_id_plan_id_key;
