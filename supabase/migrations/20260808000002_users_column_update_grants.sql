-- users.couple_id was self-assignable, which made it a forged identity.
--
-- users_update_own has no WITH CHECK, so Postgres reuses its USING clause
-- (id = auth.uid()) for the new row: the row you may write is pinned to you, but
-- every COLUMN of it was writable. That included couple_id, and three places
-- treat couple_id as proof of membership:
--   • users_select_partner  -> read a stranger couple's profiles
--   • share_plan()          -> mint a share link for a plan you did not build
--   • plan_days_update_custom -> rewrite another couple's plan-day text
-- Point your own couple_id at a couple you learned about (trivial before
-- 20260808000001 closed the invite enumeration) and all three opened.
--
-- RLS cannot express "any column except this one", so the fix is the older
-- mechanism underneath it: column-level UPDATE privileges. The client keeps
-- exactly the columns it legitimately writes; couple_id becomes writable only by
-- the pairing functions (SECURITY DEFINER) and the service role.

revoke update on public.users from anon, authenticated;

grant update (
  display_name,
  avatar_initial,
  expo_push_token,
  notification_morning_time,
  notification_partner,
  notification_prayer,
  notification_dream,
  notification_note,
  notification_recap
) on public.users to authenticated;

-- The write sites this list was taken from, so a new one is easy to check
-- against: src/lib/account.ts (display_name, avatar_initial),
-- src/lib/notifications.ts (expo_push_token, then the six notification_* prefs).
-- email is deliberately NOT grantable: it mirrors auth.users and is set by the
-- handle_new_user trigger. If a screen ever needs a new column here, add it to
-- this grant rather than reaching for a policy.

-- ------------------------------------------------------------------
-- Defense in depth for the two functions that trusted the column. Both now
-- authorize off the pairing itself, which is the same shape plans_select and
-- plans_insert_custom already use, and cannot be forged from the client at all.
-- users_select_partner is deliberately left as it is: with couple_id no longer
-- writable, current_user_couple_id() is honest again and the policy is sound.
-- ------------------------------------------------------------------
create or replace function public.share_plan(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_token uuid;
begin
  select share_token into v_token
  from plans
  where id = p_plan_id
    and is_curated = false
    and couple_id in (
      select c.id from couples c
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    );

  if not found then
    raise exception 'not your plan to share';
  end if;

  if v_token is null then
    v_token := gen_random_uuid();
    update plans set share_token = v_token where id = p_plan_id;
  end if;

  return v_token;
end;
$$;

revoke execute on function public.share_plan(uuid) from public, anon;
grant execute on function public.share_plan(uuid) to authenticated;

drop policy if exists plan_days_update_custom on public.plan_days;
create policy plan_days_update_custom on public.plan_days
  for update
  to authenticated
  using (
    plan_id in (
      select id from public.plans
      where is_curated = false
        and couple_id in (
          select c.id from public.couples c
          where c.partner_a_id = (select auth.uid())
             or c.partner_b_id = (select auth.uid())
        )
    )
  )
  with check (
    plan_id in (
      select id from public.plans
      where is_curated = false
        and couple_id in (
          select c.id from public.couples c
          where c.partner_a_id = (select auth.uid())
             or c.partner_b_id = (select auth.uid())
        )
    )
  );
