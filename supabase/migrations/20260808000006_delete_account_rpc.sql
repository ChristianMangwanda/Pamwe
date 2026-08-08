-- Account deletion ran as eighteen separate statements, each committing on its
-- own. A failure anywhere in the middle returned a 500 while the earlier steps
-- had already happened for good: prayers, entries, dreams and highlights gone,
-- the couple half-demoted, the account still alive. The routine's own comment
-- promised "the account is still intact and the user can retry", which was true
-- only of the auth row.
--
-- Everything in the public schema now happens in one function, so it is one
-- transaction: it all lands or none of it does.
--
-- Two things stay outside, deliberately:
--   • the storage objects, which are not transactional. The edge function deletes
--     them FIRST and now checks the result, so a storage failure aborts while the
--     entries rows that locate the recordings are still there to retry from.
--   • the auth.users row. That schema belongs to GoTrue, and a definer function
--     reaching into it would depend on grants and an internal FK layout that an
--     auth upgrade can rearrange without a migration on our side.
--     admin.deleteUser() is the supported path, and by the time it runs nothing
--     references the row. If it fails, public data is gone but the account
--     remains: the user retries, and this function is safe to re-enter (every
--     statement is a delete or an update keyed on the caller).

create or replace function public.delete_account(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_couple public.couples;
  v_partner uuid;
  v_token text;
begin
  if p_user is null then
    raise exception 'delete_account: no user';
  end if;

  -- Resolve the couple and partner before anything is removed.
  select c.* into v_couple
  from public.couples c
  join public.users u on u.couple_id = c.id
  where u.id = p_user
  for update of c;

  if found then
    v_partner := case when v_couple.partner_a_id = p_user
                      then v_couple.partner_b_id
                      else v_couple.partner_a_id end;
  end if;

  -- The surviving partner's push token, read here so the edge function can send
  -- the "partner has left" push after the account is actually gone.
  if v_partner is not null then
    select u.expo_push_token into v_token from public.users u where u.id = v_partner;
  end if;

  -- The departing user's own content. None of this cascades from auth.users, and
  -- a row left behind a NO ACTION key makes the auth-row delete fail later.
  delete from public.prayer_marks where user_id = p_user;
  delete from public.entries where user_id = p_user;
  delete from public.prayers where author_id = p_user;
  delete from public.dreams where author_id = p_user;
  delete from public.verse_highlights where user_id = p_user;
  delete from public.verse_notes where user_id = p_user;
  -- ask_pamwe_usage carries no FK at all, so nothing would cascade it.
  delete from public.ask_pamwe_usage where user_id = p_user;

  -- A plan the couple BUILT is not the departing user's alone: the survivor may
  -- be reading it right now. Authorship leaves, the plan stays.
  update public.plans set created_by = null where created_by = p_user;

  -- Demote the couple, never delete it while a partner remains: couples ->
  -- couple_plans -> entries and couples -> prayers would cascade away the
  -- survivor's own history.
  if v_couple.id is not null then
    if v_partner is null then
      -- Never-paired couple. Detach the departing user's profile first, or the
      -- users.couple_id reference (NO ACTION) blocks the delete.
      update public.users set couple_id = null where couple_id = v_couple.id;
      delete from public.couples where id = v_couple.id;
    else
      update public.couples set
        partner_a_id = case when v_couple.partner_a_id = p_user then v_partner else partner_a_id end,
        partner_b_id = null,
        paired_at = null,
        streak_count = 0,
        streak_last_date = null,
        freeze_days_used = 0,
        freeze_period_start = null,
        invite_code = public.generate_invite_code(),
        invite_expires_at = now() + interval '7 days'
      where id = v_couple.id;
    end if;
  end if;

  return jsonb_build_object(
    'paired', v_partner is not null,
    'partner_push_token', v_token
  );
end;
$$;

-- p_user is trusted input: the edge function derives it from a verified JWT and
-- passes it with the service role. No API role may call this.
revoke execute on function public.delete_account(uuid) from public, anon, authenticated;
