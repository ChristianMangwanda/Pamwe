-- delete_account still read users.expo_push_token, a column dropped on
-- 2026-08-15 when device tokens moved to push_tokens. The function was written
-- on 2026-08-08 and, thanks to the missing service_role grant fixed in
-- 20260821000001, had never once executed, so nothing ever caught the schema
-- moving underneath it. The first real deletion after the grant fix answered
-- "column u.expo_push_token does not exist", on camera, during the App Review
-- recording.
--
-- The farewell push now fans out over push_tokens like every notify-* function
-- does: the RPC returns partner_push_tokens as an array (empty when the partner
-- has no registered device) and the edge function sends to each. The singular
-- key is gone, and the edge function is deployed in the same change.
--
-- Everything else is the 20260808000006 routine unchanged. All tables that
-- reference public.users were audited today: every FK is CASCADE or SET NULL,
-- so the auth-row delete that follows this cannot be blocked by leftovers.
create or replace function public.delete_account(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_couple public.couples;
  v_partner uuid;
  v_tokens jsonb := '[]'::jsonb;
begin
  if p_user is null then
    raise exception 'delete_account: no user';
  end if;

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

  if v_partner is not null then
    select coalesce(jsonb_agg(pt.token), '[]'::jsonb) into v_tokens
    from public.push_tokens pt where pt.user_id = v_partner;
  end if;

  -- The departing user's own content. None of this cascades from auth.users, and
  -- a row left behind a NO ACTION key makes the auth-row delete fail later.
  delete from public.prayer_marks where user_id = p_user;
  delete from public.entries where user_id = p_user;
  delete from public.prayers where author_id = p_user;
  delete from public.dreams where author_id = p_user;
  delete from public.verse_highlights where user_id = p_user;
  delete from public.verse_notes where user_id = p_user;
  delete from public.ask_pamwe_usage where user_id = p_user;

  -- A plan the couple BUILT is not the departing user's alone: the survivor may
  -- be reading it right now. Authorship leaves, the plan stays.
  update public.plans set created_by = null where created_by = p_user;

  -- Demote the couple, never delete it while a partner remains: couples ->
  -- couple_plans -> entries and couples -> prayers would cascade away the
  -- survivor's own history.
  if v_couple.id is not null then
    if v_partner is null then
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
    'partner_push_tokens', v_tokens
  );
end;
$$;

-- 20260808000006's revoke stands; the grant from 20260821000001 must survive
-- CREATE OR REPLACE (it does: replacing a function keeps its ACL), stated here
-- so nobody has to remember that.
