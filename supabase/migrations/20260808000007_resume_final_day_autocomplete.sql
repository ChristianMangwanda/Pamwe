-- Undoes the temporary pause in 20260807000003, which held the final-day
-- completion back so a phone on build 23 could finish the plan it was on without
-- the plan disappearing mid-reveal. Build 24 pins the plan in useTodayEntry, so
-- the completion is safe to hand back to the trigger.
--
-- ⚠️ APPLY TO HOSTED ONLY WHEN EVERY PHONE IN USE IS ON BUILD 24 OR LATER.
-- Applying it early re-opens the exact bug the pause existed to avoid.
--
-- The function is 20260714000002's definition, restored. It counts
-- `count(distinct user_id) = 2` over the day, which was forgeable until
-- 20260808000003 stopped an entry being written into a plan you are not in; with
-- that closed, the only rows in a couple's plan are the couple's own.

create or replace function public.advance_plan_day_if_mutual_submit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_both boolean; v_current int; v_duration int;
begin
  if new.submitted_at is null then return new; end if;

  select count(distinct user_id) = 2 into v_both
  from public.entries
  where couple_plan_id = new.couple_plan_id and day_number = new.day_number
    and submitted_at is not null;
  if not v_both then return new; end if;

  select cp.current_day, p.duration_days into v_current, v_duration
  from public.couple_plans cp join public.plans p on cp.plan_id = p.id
  where cp.id = new.couple_plan_id;

  -- Final day only. Mid-plan advancement happens at Amen, client-side.
  if new.day_number = v_current and v_current >= v_duration then
    update public.couple_plans set status = 'completed'
      where id = new.couple_plan_id and status <> 'completed';
  end if;

  return new;
end;
$$;

revoke execute on function public.advance_plan_day_if_mutual_submit() from public, anon, authenticated;

-- Any plan that reached its last day while the trigger was paused. The trigger
-- only fires on new submits, so without this those plans stay 'active' forever,
-- keep offering a day that is already read, and never reach the Grove.
update public.couple_plans cp
   set status = 'completed'
  from public.plans p, public.couples c
 where p.id = cp.plan_id
   and c.id = cp.couple_id
   and cp.status = 'active'
   and cp.current_day >= p.duration_days
   and (
     select count(distinct e.user_id)
     from public.entries e
     where e.couple_plan_id = cp.id
       and e.day_number = p.duration_days
       and e.submitted_at is not null
       and e.user_id in (c.partner_a_id, c.partner_b_id)
   ) = 2;
