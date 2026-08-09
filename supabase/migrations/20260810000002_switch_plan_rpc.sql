-- Enrolling in a plan retired the old one in a separate round trip.
--
-- enrollInPlan (src/lib/plans.ts) did two writes with no transaction around
-- them: UPDATE the active enrolment to 'completed', then INSERT the new one. A
-- failure between them (a dropped connection, a timeout, anything that is not
-- the 23505 the code already handles) left the couple with NO active plan. The
-- auth gate then routes them to plan-select and Today shows the no-plan state,
-- and nothing in the app can set a plan back to active. Worse, if the retired
-- plan had not reached its last day it also fails isFinished(), so it does not
-- appear in the Completed list either: the plan a couple was in the middle of
-- simply vanishes from both lists.
--
-- One function, one transaction. Either the switch happens or nothing does.

create or replace function public.switch_plan(
  p_couple uuid,
  p_plan uuid,
  p_cadence int default 1
)
returns public.couple_plans
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row public.couple_plans;
  v_tz text;
  v_start date;
begin
  -- The three rhythms in CADENCE_OPTIONS. A cadence outside them would break
  -- expectedDay/daysBehind and the morning reminder in ways nothing checks.
  if p_cadence not in (1, 2, 7) then
    raise exception 'Unknown rhythm';
  end if;

  -- start_date is decided here rather than sent by the device. It anchors the
  -- cadence gate (canOpenDay), and the client computed it from
  -- toISOString(), which is UTC: a couple far enough east enrolled with
  -- yesterday's date and could open day 2 on their first evening. The couple's
  -- own timezone is the honest anchor, validated the way create_couple
  -- validates it, because older rows were written by the client and may hold
  -- anything.
  select c.timezone into v_tz from public.couples c where c.id = p_couple;
  v_tz := coalesce(nullif(btrim(v_tz), ''), 'UTC');
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_start := (now() at time zone v_tz)::date;

  -- SECURITY INVOKER, deliberately unlike the pairing functions: couple_plans
  -- still has legitimate client policies (couple_plans_insert/update key on
  -- membership), so RLS remains the guard and this function adds only
  -- atomicity. A DEFINER here would be a second authorization path to keep in
  -- step with the first, for nothing.
  update public.couple_plans
     set status = 'completed'
   where couple_id = p_couple
     and status = 'active';

  begin
    insert into public.couple_plans (
      couple_id, plan_id, start_date, current_day, cadence_days, status
    )
    values (p_couple, p_plan, v_start, 1, p_cadence, 'active')
    returning * into v_row;
  exception when unique_violation then
    -- couple_plans_one_active: the partner enrolled in the same moment (both
    -- land on plan-select right after pairing). Their enrolment IS the couple's
    -- plan, so adopt it rather than failing. This used to live in the client;
    -- inside the transaction it can no longer adopt a row that a half-finished
    -- switch created.
    select * into v_row
      from public.couple_plans
     where couple_id = p_couple
       and status = 'active'
     order by created_at desc
     limit 1;
  end;

  return v_row;
end;
$$;

revoke execute on function public.switch_plan(uuid, uuid, int) from public, anon;
grant execute on function public.switch_plan(uuid, uuid, int) to authenticated;
