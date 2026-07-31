-- The couple's own anniversary: the date they count from, not the date they
-- signed up. The Lock Screen widget reads it as "N days together", and the You
-- tab already showed that stat derived from paired_at, which for most couples
-- is off by years.
--
-- Nullable on purpose. Until someone sets it, everything falls back to
-- paired_at exactly as before, so no screen and no widget has to special-case
-- a couple who never opens the setting.

alter table public.couples add column if not exists anniversary date;

-- Written through a function, not a policy. The only UPDATE policies on couples
-- (couples_update_join, couples_update_regenerate_invite) both require
-- partner_b_id IS NULL, so a paired member cannot update the row at all, and
-- adding a member-wide UPDATE policy would hand the client streak_count,
-- invite_code, timezone and the partner ids along with it. This grants exactly
-- one column to exactly the two people in the couple.
create or replace function public.set_couple_anniversary(p_anniversary date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid;
begin
  select c.id into v_couple
  from couples c
  where c.partner_a_id = (select auth.uid())
     or c.partner_b_id = (select auth.uid());

  if v_couple is null then
    raise exception 'no couple for this user';
  end if;

  -- A future anniversary would render as a negative day count on the widget,
  -- where there is no room to explain itself.
  if p_anniversary is not null and p_anniversary > current_date then
    raise exception 'anniversary cannot be in the future';
  end if;

  update couples set anniversary = p_anniversary where id = v_couple;
  return p_anniversary;
end;
$$;

revoke execute on function public.set_couple_anniversary(date) from public, anon;
grant execute on function public.set_couple_anniversary(date) to authenticated;
