-- Leaving the pair, and the archive that survives it.
--
-- Christian's decision (2026-08-10): the partner who is left goes back to
-- unpaired and may pair with anyone; the archive stays readable to BOTH of them
-- forever; and pairing again, even with each other, starts a new journey. A
-- sealed couple is never revived, which is what keeps this simple: no policy
-- has to reason about a row coming back to life.
--
-- The hard part is not leaving, it is reading afterwards. Every policy in the
-- app reaches rows through current_user_couple_id(), and that is NULL the moment
-- you leave, so the couple who kept a hundred and fifty days of reflections
-- would lose all of them at exactly the moment those reflections matter most.

alter table public.couples
  add column if not exists left_at timestamptz,
  add column if not exists left_by uuid references public.users(id) on delete set null,
  add column if not exists farewell_note text,
  add column if not exists farewell_read_at timestamptz;

alter table public.couples
  drop constraint if exists couples_farewell_note_length;
alter table public.couples
  add constraint couples_farewell_note_length check (farewell_note is null or char_length(farewell_note) <= 1000);

-- ------------------------------------------------------------------
-- Every couple I have ever been in, current or sealed.
--
-- SECURITY DEFINER for the same reason current_user_couple_id() is: a policy on
-- couples that reads couples recurses. This reads only rows the caller is named
-- on, so it hands back nothing they could not already see.
-- ------------------------------------------------------------------
create or replace function public.my_couple_ids()
returns setof uuid language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from public.couples c
   where c.partner_a_id = (select auth.uid())
      or c.partner_b_id = (select auth.uid());
$$;

revoke execute on function public.my_couple_ids() from public, anon;
grant execute on function public.my_couple_ids() to authenticated;

-- Membership, rather than "the couple I am currently in". Strictly wider than
-- couples_select_own (which it subsumes) and still reaches nothing the caller is
-- not named on. Read only: no write path to a couple row exists at all, sealed
-- or otherwise, and this does not add one.
drop policy if exists couples_select_membership on public.couples;
create policy couples_select_membership on public.couples
  for select to authenticated
  using (id in (select public.my_couple_ids()));

-- ------------------------------------------------------------------
-- The reflections themselves.
--
-- The locked reveal does NOT relax in the archive. A day where only one of you
-- ever wrote is a day the other never earned, and leaving is not a way to
-- collect it. So these mirror the live policies exactly, with membership in a
-- SEALED couple standing in for current membership.
-- ------------------------------------------------------------------
drop policy if exists entries_select_archived_own on public.entries;
create policy entries_select_archived_own on public.entries
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.couple_plans cp
      where cp.id = entries.couple_plan_id
        and cp.couple_id in (select public.my_couple_ids())
    )
  );

drop policy if exists entries_select_archived_partner on public.entries;
create policy entries_select_archived_partner on public.entries
  for select to authenticated
  using (
    user_id <> (select auth.uid())
    and exists (
      select 1 from public.couple_plans cp
      where cp.id = entries.couple_plan_id
        and cp.couple_id in (select public.my_couple_ids())
    )
    -- Both of you wrote that day, which is the same test the live policy makes.
    and entries.submitted_at is not null
    and public.has_user_submitted_entry(entries.couple_plan_id, entries.day_number, (select auth.uid()))
  );

-- The plan a day belonged to, so the archive can say what was being read.
drop policy if exists couple_plans_select_archived on public.couple_plans;
create policy couple_plans_select_archived on public.couple_plans
  for select to authenticated
  using (couple_id in (select public.my_couple_ids()));

-- ------------------------------------------------------------------
-- leave_couple: one transaction, and no way back.
-- ------------------------------------------------------------------
create or replace function public.leave_couple(p_note text default null)
returns public.couples
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple public.couples;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_couple from public.couples c
   where c.id = (select u.couple_id from public.users u where u.id = v_uid)
   for update;

  if v_couple.id is null then raise exception 'You are not in a couple'; end if;
  if v_couple.left_at is not null then return v_couple; end if;

  update public.couples
     set left_at = now(),
         left_by = v_uid,
         farewell_note = nullif(btrim(coalesce(p_note, '')), ''),
         -- A sealed couple is not paused; it is over. Leaving a pause hanging
         -- would leave an interval the streak keeps subtracting forever.
         paused_at = null,
         paused_by = null
   where id = v_couple.id
   returning * into v_couple;

  update public.couple_pauses set ended_at = now(), ended_by = v_uid
   where couple_id = v_couple.id and ended_at is null;

  -- Nothing is left to agree about.
  update public.couple_requests
     set status = 'withdrawn', responded_at = now(), responded_by = v_uid
   where couple_id = v_couple.id and status = 'pending';

  -- BOTH of them, in the same statement. The partner who was left is free
  -- immediately: making them wait for their own tap would be one person
  -- deciding when the other may move on.
  update public.users
     set couple_id = null
   where id in (v_couple.partner_a_id, v_couple.partner_b_id);

  -- An active plan on a sealed couple would keep offering readings to nobody.
  update public.couple_plans set status = 'completed'
   where couple_id = v_couple.id and status = 'active';

  return v_couple;
end;
$$;

revoke execute on function public.leave_couple(text) from public, anon;
grant execute on function public.leave_couple(text) to authenticated;

-- ------------------------------------------------------------------
-- The note is read once, by the person it was left for.
--
-- "She reads it once" is the handoff's own copy, so it has to be true rather
-- than a promise the UI keeps by itself. Stamping it here means it is true even
-- if they reinstall, and means the writer can be told it was read.
-- ------------------------------------------------------------------
create or replace function public.mark_farewell_read(p_couple uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := (select auth.uid()); v_row public.couples;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.couples c where c.id = p_couple for update;
  if v_row.id is null then raise exception 'No such couple'; end if;
  if v_uid not in (v_row.partner_a_id, v_row.partner_b_id) then
    raise exception 'That is not yours to read';
  end if;
  -- The person who wrote it is not the person it is for.
  if v_row.left_by = v_uid then return; end if;

  update public.couples
     set farewell_read_at = coalesce(farewell_read_at, now())
   where id = p_couple;
end;
$$;

revoke execute on function public.mark_farewell_read(uuid) from public, anon;
grant execute on function public.mark_farewell_read(uuid) to authenticated;

-- ------------------------------------------------------------------
-- What an archive is worth, in two numbers.
--
-- Counted in the database rather than by pulling every row to the phone: the
-- closed screen shows "151 days, 128 notes" before the archive is even opened,
-- and a couple three years in have thousands of rows behind those numbers.
-- ------------------------------------------------------------------
create or replace function public.archive_summary(p_couple uuid)
returns table (days int, notes int)
language sql stable security definer set search_path = public, pg_temp as $$
  select
    coalesce((
      select count(distinct (cp.id, e.day_number))
      from public.entries e
      join public.couple_plans cp on cp.id = e.couple_plan_id
      where cp.couple_id = p_couple and e.submitted_at is not null
    ), 0)::int,
    coalesce((
      select count(*)
      from public.entries e
      join public.couple_plans cp on cp.id = e.couple_plan_id
      where cp.couple_id = p_couple and e.submitted_at is not null
    ), 0)::int
  where p_couple in (select public.my_couple_ids());
$$;

revoke execute on function public.archive_summary(uuid) from public, anon;
grant execute on function public.archive_summary(uuid) to authenticated;
