-- Catching up alone must not need your partner's permission.
--
-- couple_plans.current_day is one pointer for the couple, it only moves on Amen,
-- and Amen needs BOTH partners sealed for that day. The catch-up screen handed
-- the Reflect button to current_day and nothing else, so a person four days
-- behind wrote one reflection and stopped. If their partner was also behind,
-- nobody moved and the gap kept growing.
--
-- The client half of the fix lets a person write every day they still owe, in
-- one sitting, out of order. That breaks two assumptions down here, both of
-- which assumed days are only ever sealed in sequence.

-- 1. ADVANCEMENT. `advancePlanDay` was an UPDATE guarded on
--    `.eq('current_day', currentDay)` and set `currentDay + 1`. Two problems
--    once days can be sealed out of order:
--
--      * Amen on a day that is not current_day matched ZERO rows. PostgREST
--        does not error on a zero-row update, so nothing threw, no alert fired,
--        and the reveal returned you to the day you started on with the plan
--        exactly where it was. Silent.
--      * Clearing a four day backlog needed four separate Amens to walk the
--        pointer forward one step at a time, even once every one of those days
--        was revealed.
--
--    So the pointer stops being incremented and starts being ANSWERED: the
--    lowest day this couple have not both sealed. That is what current_day has
--    always claimed to mean, and computing it makes a double tap a no-op and an
--    out-of-order Amen correct, the same way compute_streak stopped nudging a
--    stored counter on 2026-07-26 and started replaying the entries.
--
--    SECURITY INVOKER, deliberately, like switch_plan: couple_plans still has
--    real client policies keyed on membership, so RLS stays the guard and this
--    function adds only atomicity and arithmetic. It also means RLS does the
--    hard part for free. A partner's entry row is visible to me ONLY on days I
--    have sealed too (entries_select_partner_after_mutual_submit calls
--    has_user_submitted_entry for the caller), so `count(distinct user_id) = 2`
--    over what I can see IS the mutual-seal test, with no definer helper.
--
--    Amen still owns advancement. This does not move the pointer on seal, and
--    the trigger below still does not either. 20260714000002 took that away from
--    the database because a partner's submit yanked every ritual screen onto the
--    next day and ate the reveal, and that call stands.
create or replace function public.advance_plan_day(p_couple_plan uuid)
returns int
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_duration int;
  v_next int;
begin
  select p.duration_days into v_duration
    from public.couple_plans cp
    join public.plans p on p.id = cp.plan_id
   where cp.id = p_couple_plan;

  -- Filtered out by couple_plans_select for anyone outside the couple, so this
  -- is also how a stranger's call ends.
  if v_duration is null then
    raise exception 'Plan not found';
  end if;

  select coalesce(min(d), v_duration) into v_next
    from generate_series(1, v_duration) as d
   where not exists (
     select 1
       from public.entries e
      where e.couple_plan_id = p_couple_plan
        and e.day_number = d
        and e.submitted_at is not null
      group by e.day_number
     having count(distinct e.user_id) = 2
   );

  -- Forward only. Monotonic is what makes this safe to call from anywhere: a
  -- second Amen recomputes the same answer and changes nothing, and no ordering
  -- of two devices racing can walk the couple backwards onto a day they have
  -- already read together.
  update public.couple_plans
     set current_day = v_next
   where id = p_couple_plan
     and current_day < v_next;

  return v_next;
end;
$$;

revoke execute on function public.advance_plan_day(uuid) from public, anon;
grant execute on function public.advance_plan_day(uuid) to authenticated;

comment on function public.advance_plan_day(uuid) is
  'Sets couple_plans.current_day to the lowest day the couple have not both sealed. Idempotent and forward-only. Called from the reveal''s Amen.';

-- 2. COMPLETION. The trigger asked `new.day_number = v_current and v_current >=
--    v_duration`: the final day landing on the day the couple were pointed at.
--    Out of order that is no longer the same question as "the plan is finished",
--    and a couple who seals the last day while the pointer is three days back
--    would finish the plan and never be told, keeping a completed plan active
--    forever, still offering days, never reaching the Grove.
--
--    Asking the real question costs one grouped scan of the plan's entries on
--    the reveal-lookup index, not 365 probes: a plan is finished when the number
--    of distinct fully-sealed days inside 1..duration reaches duration.
--
--    `day_number between 1 and v_duration` is load-bearing. Nothing in the
--    database bounds that column (the gate is canOpenDay, client-side), so
--    without it a single planted row at day 9999 would count toward completion.
create or replace function public.advance_plan_day_if_mutual_submit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_both boolean; v_duration int; v_sealed int; v_a uuid; v_b uuid;
begin
  if new.submitted_at is null then return new; end if;

  select p.duration_days, c.partner_a_id, c.partner_b_id
    into v_duration, v_a, v_b
    from public.couple_plans cp
    join public.plans p on p.id = cp.plan_id
    join public.couples c on c.id = cp.couple_id
   where cp.id = new.couple_plan_id;
  if v_duration is null then return new; end if;

  -- Cheap exit on the overwhelmingly common case: this day is not sealed yet,
  -- so nothing about the plan's completion can have changed.
  select count(distinct user_id) = 2 into v_both
  from public.entries
  where couple_plan_id = new.couple_plan_id and day_number = new.day_number
    and submitted_at is not null
    and user_id in (v_a, v_b);
  if not v_both then return new; end if;

  select count(*) into v_sealed from (
    select e.day_number
      from public.entries e
     where e.couple_plan_id = new.couple_plan_id
       and e.submitted_at is not null
       and e.user_id in (v_a, v_b)
       and e.day_number between 1 and v_duration
     group by e.day_number
    having count(distinct e.user_id) = 2
  ) sealed_days;

  if v_sealed >= v_duration then
    update public.couple_plans set status = 'completed'
      where id = new.couple_plan_id and status <> 'completed';
  end if;

  return new;
end;
$$;

revoke execute on function public.advance_plan_day_if_mutual_submit() from public, anon, authenticated;

-- Every active plan that is in fact finished, on the new definition. The trigger
-- only fires on new submits, so a plan already whole stays active without this.
-- Idempotent, and the same shape of backfill every streak migration ends with.
update public.couple_plans cp
   set status = 'completed'
  from public.plans p, public.couples c
 where p.id = cp.plan_id
   and c.id = cp.couple_id
   and cp.status = 'active'
   and (
     select count(*) from (
       select e.day_number
         from public.entries e
        where e.couple_plan_id = cp.id
          and e.submitted_at is not null
          and e.user_id in (c.partner_a_id, c.partner_b_id)
          and e.day_number between 1 and p.duration_days
        group by e.day_number
       having count(distinct e.user_id) = 2
     ) s
   ) >= p.duration_days;

-- And every active plan whose pointer is behind days the couple have already
-- finished together. Nothing could produce that before this round, so this is
-- expected to touch zero rows; it exists so applying the migration leaves the
-- pointer meaning the same thing everywhere, including on any row a client
-- wrote directly through couple_plans_update.
update public.couple_plans cp
   set current_day = sub.next_day
  from (
    select cp2.id,
           coalesce(min(d), p2.duration_days) as next_day
      from public.couple_plans cp2
      join public.plans p2 on p2.id = cp2.plan_id
      join public.couples c2 on c2.id = cp2.couple_id
     cross join lateral generate_series(1, p2.duration_days) as d
     where cp2.status = 'active'
       and not exists (
         select 1
           from public.entries e
          where e.couple_plan_id = cp2.id
            and e.day_number = d
            and e.submitted_at is not null
            and e.user_id in (c2.partner_a_id, c2.partner_b_id)
          group by e.day_number
         having count(distinct e.user_id) = 2
       )
     group by cp2.id, p2.duration_days
  ) sub
 where sub.id = cp.id
   and cp.current_day < sub.next_day;
