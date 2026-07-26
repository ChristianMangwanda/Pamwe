-- The streak reset on any gap wider than the cadence, so a couple who read 9 days
-- across 15 calendar days saw "1". It also gave no credit for catching up: days 7
-- and 8 both sealed on the same date and only one counted, which contradicted the
-- documented rule that a streak counts plan days completed, not calendar days.
--
-- Two changes, Christian's call 2026-07-26:
--   * WIDER WINDOW. Miss up to 4 days in a row and the streak survives; a fifth
--     breaks it. No grace-day budget to track, just a more forgiving gap.
--   * CATCH-UP COUNTS. Two readings sealed on one day now count twice (a gap of
--     0 is inside any window), instead of the second being silently skipped.
--
-- And it is now DERIVED, not incremented. The old trigger nudged a stored counter,
-- so any missed fire or out-of-order seal left it permanently wrong with no way
-- back. This recomputes from entries, the source of truth, on every seal: it is
-- idempotent, self-healing, and the same function does the backfill.

create or replace function public.compute_streak(p_couple uuid)
returns table (streak int, last_date date)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tz text;
  v_window int;
  r record;
  v_prev date := null;
  v_count int := 0;
begin
  select coalesce(c.timezone, 'UTC') into v_tz from public.couples c where c.id = p_couple;
  -- Widest rhythm the couple reads on, plus four forgiven days.
  select coalesce(max(cp.cadence_days), 1) + 4 into v_window
    from public.couple_plans cp where cp.couple_id = p_couple;

  -- One row per SEALED plan day (both partners submitted), dated by the first
  -- submit of the pair so a session straddling midnight counts for the day it began.
  for r in
    select min(e.submitted_at at time zone v_tz)::date as d
    from public.entries e
    join public.couple_plans cp on cp.id = e.couple_plan_id
    where cp.couple_id = p_couple and e.submitted_at is not null
    group by e.couple_plan_id, e.day_number
    having count(distinct e.user_id) = 2
    order by 1
  loop
    if v_prev is null or (r.d - v_prev) <= v_window then
      v_count := v_count + 1;
    else
      v_count := 1;
    end if;
    v_prev := r.d;
  end loop;

  return query select v_count, v_prev;
end;
$$;

revoke execute on function public.compute_streak(uuid) from public, anon, authenticated;

create or replace function public.update_streak_on_mutual_submit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_both boolean; v_couple uuid; v_streak int; v_last date;
begin
  if new.submitted_at is null then return new; end if;

  select count(distinct user_id) = 2 into v_both
  from public.entries
  where couple_plan_id = new.couple_plan_id and day_number = new.day_number
    and submitted_at is not null;
  if not v_both then return new; end if;

  select cp.couple_id into v_couple
  from public.couple_plans cp where cp.id = new.couple_plan_id;

  select s.streak, s.last_date into v_streak, v_last from public.compute_streak(v_couple) s;

  update public.couples
    set streak_count = v_streak, streak_last_date = v_last
  where id = v_couple;

  return new;
end;
$$;

-- Backfill: score every couple's real history under the new rule.
update public.couples c
set (streak_count, streak_last_date) =
    (select s.streak, s.last_date from public.compute_streak(c.id) s);
