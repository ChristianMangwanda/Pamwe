-- An entry could be written into a plan that was not yours, and the streak
-- believed it.
--
-- entries_insert_own only ever checked user_id = auth.uid(), and after
-- 20260709000002 the draft UPDATE's WITH CHECK checks the same one thing. So a
-- signed-in user could insert a row carrying ANOTHER couple's couple_plan_id, or
-- re-point their own draft at one and seal it in the same statement. Nothing
-- downstream noticed, because the mutual-submit logic counts
-- `count(distinct user_id) = 2` over (couple_plan_id, day_number): any two
-- distinct people, not the couple's two people. One planted row plus one real
-- submission therefore sealed a day for strangers and moved their streak.
--
-- Reading was never affected (entries_select_partner_after_mutual_submit and the
-- voice-entries storage policies both join couples properly). This closes the
-- write side, and makes the counting say what it always meant.

alter policy entries_insert_own on public.entries
  with check (
    user_id = (select auth.uid())
    and couple_plan_id in (
      select cp.id
      from public.couple_plans cp
      join public.couples c on c.id = cp.couple_id
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

-- Same expression on the draft UPDATE. It keeps letting a draft seal (that is why
-- the WITH CHECK deliberately omits `submitted_at is null`), but the row can no
-- longer be moved to a plan the author is not in.
alter policy entries_update_own_draft on public.entries
  with check (
    user_id = (select auth.uid())
    and couple_plan_id in (
      select cp.id
      from public.couple_plans cp
      join public.couples c on c.id = cp.couple_id
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------------
-- The two counting sites, from 20260726000002 verbatim except for the partner
-- filter. Everything the streak rule is documented on (the cadence + 4 window,
-- the couple's timezone, dating a day by the first submit of the pair, catch-up
-- counting twice, derived-not-incremented) is unchanged on purpose.
-- ------------------------------------------------------------------
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
  -- "Both partners" means THESE two partners: any other user's row is not a seal.
  for r in
    select min(e.submitted_at at time zone v_tz)::date as d
    from public.entries e
    join public.couple_plans cp on cp.id = e.couple_plan_id
    join public.couples c on c.id = cp.couple_id
    where cp.couple_id = p_couple
      and e.submitted_at is not null
      and e.user_id in (c.partner_a_id, c.partner_b_id)
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

  select cp.couple_id into v_couple
  from public.couple_plans cp where cp.id = new.couple_plan_id;

  select count(distinct e.user_id) = 2 into v_both
  from public.entries e
  join public.couples c on c.id = v_couple
  where e.couple_plan_id = new.couple_plan_id
    and e.day_number = new.day_number
    and e.submitted_at is not null
    and e.user_id in (c.partner_a_id, c.partner_b_id);
  if not v_both then return new; end if;

  select s.streak, s.last_date into v_streak, v_last from public.compute_streak(v_couple) s;

  update public.couples
    set streak_count = v_streak, streak_last_date = v_last
  where id = v_couple;

  return new;
end;
$$;

revoke execute on function public.update_streak_on_mutual_submit() from public, anon, authenticated;

-- Rescore every couple under the corrected count. Idempotent, same as 20260726000002.
update public.couples c
set (streak_count, streak_last_date) =
    (select s.streak, s.last_date from public.compute_streak(c.id) s);
