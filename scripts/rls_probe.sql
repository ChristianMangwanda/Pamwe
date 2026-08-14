-- Does the database actually refuse what we think it refuses?
--
-- Every one of the 280-odd Jest tests mocks the Supabase client, so a policy can
-- be wide open and the suite stays green: couples.test.ts asserted the FILTERS
-- joinCouple sent, never whether the database would have honoured them. That is
-- how the bug in 20260709000002 shipped, as its own comment admits.
--
-- This runs as a real signed-in user against a real local stack, and asserts on
-- the four holes closed on 2026-08-08 plus the pairing flow that replaced them.
-- Each probe is its own transaction and rolls back, so it can be re-run forever.
--
--   ./scripts/local_dev_seed.sh    # alice + bob, paired
--   docker exec -i supabase_db_Pamwe psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < scripts/rls_probe.sql
--
-- Any failure raises. Silence at the end means everything held.

\set ON_ERROR_STOP on

-- A third party: signed in, real account, belongs to no couple. Everything below
-- is asked from their seat, because that is the attacker the review described.
do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = 'mallory@pamwe.dev';
  if v_id is null then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'mallory@pamwe.dev', extensions.crypt('dev-password', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mallory"}', now(), now(),
      '', '', '', '', '');
  end if;
end $$;

-- Fixtures the probes read: the dev couple, and the outsider.
create temporary table probe_ids as
select
  (select id from auth.users where email = 'alice@pamwe.dev')   as alice,
  (select id from auth.users where email = 'bob@pamwe.dev')     as bob,
  (select id from auth.users where email = 'mallory@pamwe.dev') as mallory,
  (select couple_id from public.users u
     where u.id = (select id from auth.users where email = 'alice@pamwe.dev')) as couple,
  (select cp.id from public.couple_plans cp
     where cp.couple_id = (select couple_id from public.users u
       where u.id = (select id from auth.users where email = 'alice@pamwe.dev'))
     limit 1) as couple_plan;

-- The probes read this after becoming a signed-in user, so it has to be readable
-- by that role. It is a temp table: it dies with the session, ids only.
grant select on probe_ids to authenticated;

do $$
begin
  if (select mallory from probe_ids) is null or (select couple from probe_ids) is null then
    raise exception 'probe fixtures missing: run ./scripts/local_dev_seed.sh first';
  end if;
end $$;

-- Handy: become a signed-in user for the rest of the transaction.
-- (set_config with is_local = true, so it dies with the rollback.)
create or replace function pg_temp.be(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Back to the owner, for the parts of a probe that set the scene rather than test it.
create or replace function pg_temp.asowner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

-- ==================================================================
-- 1. Pending invites are not enumerable (20260808000001)
-- ==================================================================
begin;
do $$
declare v_seen int;
begin
  -- An unpaired couple with a live code, for Mallory to try to find.
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, timezone)
  values ('PROBE1', now() + interval '7 days', (select alice from probe_ids), 'UTC');

  perform pg_temp.be((select mallory from probe_ids));
  select count(*) into v_seen from public.couples;
  if v_seen <> 0 then
    raise exception 'FAIL: an outsider can see % couple row(s); invite codes are enumerable', v_seen;
  end if;
end $$;
rollback;

-- ==================================================================
-- 2. A couple cannot be joined without its code, or written to at all
-- ==================================================================
begin;
do $$
declare v_couple uuid; v_rows int;
begin
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, timezone)
  values ('PROBE2', now() + interval '7 days', (select alice from probe_ids), 'UTC')
  returning id into v_couple;

  perform pg_temp.be((select mallory from probe_ids));
  begin
    update public.couples
       set partner_b_id = (select mallory from probe_ids), paired_at = now()
     where id = v_couple;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'FAIL: an outsider paired themselves into a couple without the code';
    end if;
  exception when insufficient_privilege then
    null;  -- the table-level revoke got there first, which is the stronger answer
  end;
end $$;
rollback;

-- ==================================================================
-- 3. join_couple: the happy path, and the three refusals
-- ==================================================================
begin;
do $$
declare v_couple uuid; v_code text; v_joined public.couples; v_msg text;
begin
  perform pg_temp.be((select mallory from probe_ids));

  -- Wrong code: refused, and refused in the caller's words.
  begin
    perform public.join_couple('NOPE99');
    raise exception 'FAIL: join_couple accepted a code that does not exist';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like 'That code didn%' then
      raise exception 'FAIL: unexpected message for a bad code: %', v_msg;
    end if;
  end;

  -- A real, live invite.
  perform pg_temp.asowner();
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, timezone)
  values (public.generate_invite_code(), now() + interval '7 days', (select alice from probe_ids), 'UTC')
  returning id, invite_code into v_couple, v_code;

  if length(v_code) <> 6 then
    raise exception 'FAIL: generated invite code is % chars, expected 6', length(v_code);
  end if;

  -- Partner A cannot spend their own invite.
  perform pg_temp.be((select alice from probe_ids));
  begin
    perform public.join_couple(v_code);
    raise exception 'FAIL: partner A joined their own invite';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like 'You are already connected%' and v_msg not like 'You can%' then
      raise exception 'FAIL: unexpected message for a self-join: %', v_msg;
    end if;
  end;

  -- Mallory spends it: paired AND linked, in one call.
  perform pg_temp.be((select mallory from probe_ids));
  select * into v_joined from public.join_couple(lower(v_code));  -- case-insensitive
  if v_joined.partner_b_id <> (select mallory from probe_ids) then
    raise exception 'FAIL: join_couple did not set partner_b_id';
  end if;
  if (select couple_id from public.users where id = (select mallory from probe_ids)) <> v_couple then
    raise exception 'FAIL: join_couple left the joiner profile unlinked';
  end if;

  -- The code is spent: a second caller gets the same flat refusal.
  perform pg_temp.be((select bob from probe_ids));
  declare v_spent boolean := false;
  begin
    begin
      perform public.join_couple(v_code);
      v_spent := true;
    exception when others then
      null;  -- any refusal will do; the wording is asserted above
    end;
    if v_spent then
      raise exception 'FAIL: a spent invite code was accepted twice';
    end if;
  end;
end $$;
rollback;

-- ==================================================================
-- 4. users.couple_id is not self-assignable (20260808000002)
-- ==================================================================
begin;
do $$
begin
  perform pg_temp.be((select mallory from probe_ids));
  begin
    update public.users set couple_id = (select couple from probe_ids)
     where id = (select mallory from probe_ids);
    raise exception 'FAIL: a user assigned themselves into another couple';
  exception when insufficient_privilege then
    null;
  end;

  -- The columns the app really writes still work.
  update public.users set display_name = 'Mallory' where id = (select mallory from probe_ids);
  update public.users set notification_partner = false where id = (select mallory from probe_ids);
end $$;
rollback;

-- ==================================================================
-- 5. Entries cannot be written into someone else's plan (20260808000003)
-- ==================================================================
begin;
do $$
declare v_entry uuid;
begin
  perform pg_temp.be((select mallory from probe_ids));

  -- Straight injection into the dev couple's plan.
  begin
    insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
    values ((select couple_plan from probe_ids), 1, (select mallory from probe_ids), 'text', 'not mine', now());
    raise exception 'FAIL: an outsider inserted an entry into another couple''s plan';
  exception when insufficient_privilege then null;
       when others then
         if sqlstate = 'P0001' then raise;  -- our own FAIL, let it out
         else raise exception 'FAIL: expected an RLS refusal, got % (%)', sqlerrm, sqlstate;
         end if;
  end;
end $$;
rollback;

-- The other half of the same hole: re-pointing your OWN draft at a foreign plan.
begin;
do $$
declare v_couple uuid; v_plan uuid; v_cp uuid; v_entry uuid;
begin
  -- Give Mallory a couple and a plan of her own, so she has a legitimate draft.
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, partner_b_id, paired_at, timezone)
  values ('PROBE5', now() + interval '7 days', (select mallory from probe_ids), (select bob from probe_ids), now(), 'UTC')
  returning id into v_couple;
  update public.users set couple_id = v_couple where id = (select mallory from probe_ids);
  select plan_id into v_plan from public.couple_plans where id = (select couple_plan from probe_ids);
  insert into public.couple_plans (couple_id, plan_id, start_date, current_day, status)
  values (v_couple, v_plan, current_date, 1, 'active') returning id into v_cp;

  perform pg_temp.be((select mallory from probe_ids));
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content)
  values (v_cp, 1, (select mallory from probe_ids), 'text', 'mine, honestly')
  returning id into v_entry;

  begin
    update public.entries
       set couple_plan_id = (select couple_plan from probe_ids), submitted_at = now()
     where id = v_entry;
    raise exception 'FAIL: a draft was re-pointed into another couple''s plan and sealed';
  exception when insufficient_privilege then null;
       when others then
         if sqlstate = 'P0001' then raise;  -- our own FAIL, let it out
         else raise exception 'FAIL: expected an RLS refusal, got % (%)', sqlerrm, sqlstate;
         end if;
  end;
end $$;
rollback;

-- ==================================================================
-- 6. Response rows must agree with the row they point at (20260808000004)
-- ==================================================================
begin;
do $$
declare v_entry uuid; v_note uuid;
begin
  -- Service role: the FK is the subject here, not the policy.
  select id into v_entry from public.entries
   where couple_plan_id = (select couple_plan from probe_ids) limit 1;

  if v_entry is not null then
    begin
      insert into public.entry_responses (entry_id, couple_plan_id, day_number, author_id, kind, body)
      values (v_entry, (select couple_plan from probe_ids), 999, (select alice from probe_ids), 'reply', 'wrong day');
      raise exception 'FAIL: a response stored a day_number its entry does not have';
    exception when foreign_key_violation then null;
    end;
  end if;

  insert into public.verse_notes (couple_id, user_id, book, chapter, verse, text)
  values ((select couple from probe_ids), (select alice from probe_ids), 'John', 3, 16, 'probe')
  on conflict (couple_id, book, chapter, verse) do update set text = excluded.text
  returning id into v_note;

  begin
    insert into public.verse_note_responses (note_id, couple_id, user_id, kind, body)
    values (v_note, gen_random_uuid(), (select alice from probe_ids), 'comment', 'wrong couple');
    raise exception 'FAIL: a verse response claimed a couple its note does not belong to';
  exception when foreign_key_violation then null;
  end;
end $$;
rollback;

-- ==================================================================
-- 7. notify_config keeps its secret away from the API roles
-- ==================================================================
begin;
do $$
begin
  perform pg_temp.be((select mallory from probe_ids));
  begin
    perform public.notify_config();
    raise exception 'FAIL: a signed-in user can read the service key and webhook secret';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ==================================================================
-- 8. The ritual itself still works
--
-- Every probe above asserts a refusal, and a policy that refuses everything
-- would pass all of them while bricking the app for the couple it protects.
-- This one walks the core loop as the two real partners: draft, seal, the
-- partner's seal, the streak, and the reveal opening.
-- ==================================================================
begin;
do $$
declare v_a uuid; v_b uuid; v_cp uuid; v_e uuid; v_streak int;
begin
  select alice, bob into v_a, v_b from probe_ids;
  select couple_plan into v_cp from probe_ids;

  perform pg_temp.be(v_a);
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content)
  values (v_cp, 1, v_a, 'text', 'a draft, saved as I type') returning id into v_e;

  update public.entries set text_content = 'finished', submitted_at = now() where id = v_e;

  perform pg_temp.be(v_b);
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
  values (v_cp, 1, v_b, 'text', 'mine too', now());

  perform pg_temp.asowner();
  select c.streak_count into v_streak
  from public.couples c join public.couple_plans cp on cp.couple_id = c.id where cp.id = v_cp;
  if coalesce(v_streak, 0) < 1 then
    raise exception 'FAIL: a mutual submit did not move the streak (got %)', v_streak;
  end if;

  perform pg_temp.be(v_a);
  if not exists (
    select 1 from public.entries
    where couple_plan_id = v_cp and day_number = 1 and user_id = v_b
  ) then
    raise exception 'FAIL: the reveal did not open after both partners sealed';
  end if;
end $$;
rollback;

-- ==================================================================
-- 9. create_couple and regenerate_invite_code
--
-- Section 1 and 2 set their scene by inserting into couples directly, so until
-- now two of the three pairing functions were never actually called here: the
-- code generation, the expiry and the already-paired refusal were all untested.
-- ==================================================================
begin;
do $$
declare v_m uuid; v_couple public.couples; v_first text;
begin
  select mallory into v_m from probe_ids;
  perform pg_temp.be(v_m);

  v_couple := public.create_couple('Africa/Harare');

  if length(v_couple.invite_code) <> 6 then
    raise exception 'FAIL: create_couple minted a % character code', length(v_couple.invite_code);
  end if;
  -- Decided in the database. The client used to send this, so a modified one
  -- could mint an invite that never expired.
  if v_couple.invite_expires_at < now() + interval '6 days'
     or v_couple.invite_expires_at > now() + interval '8 days' then
    raise exception 'FAIL: create_couple set an expiry of %', v_couple.invite_expires_at;
  end if;
  if v_couple.timezone <> 'Africa/Harare' then
    raise exception 'FAIL: create_couple lost the timezone (got %)', v_couple.timezone;
  end if;
  if not exists (select 1 from public.users where id = v_m and couple_id = v_couple.id) then
    raise exception 'FAIL: create_couple left the profile unlinked';
  end if;

  -- The lapsed-code escape hatch draws a new one and pushes the expiry out.
  v_first := v_couple.invite_code;
  v_couple := public.regenerate_invite_code();
  if v_couple.invite_code = v_first then
    raise exception 'FAIL: regenerate_invite_code returned the same code';
  end if;
  if v_couple.invite_expires_at < now() + interval '6 days' then
    raise exception 'FAIL: regenerate_invite_code did not refresh the expiry';
  end if;

  -- A second invite from someone already in a couple is refused.
  begin
    perform public.create_couple('UTC');
    raise exception 'FAIL: create_couple opened a second invite for a paired user';
  exception when others then
    if sqlerrm not like '%already connected%' then raise; end if;
  end;
end $$;
rollback;

-- ==================================================================
-- 10. An expired code answers exactly like an unknown one
--
-- Not tidiness. A distinguishable refusal is an oracle telling a stranger which
-- codes are real, which is the enumeration 20260808000001 closed.
-- ==================================================================
begin;
do $$
declare v_unknown text; v_expired text; v_spent text;
begin
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, timezone)
  values ('PROBEX', now() - interval '1 day', (select alice from probe_ids), 'UTC');
  insert into public.couples (invite_code, invite_expires_at, partner_a_id, partner_b_id, paired_at, timezone)
  values ('PROBES', now() + interval '7 days', (select alice from probe_ids),
          (select bob from probe_ids), now(), 'UTC');

  perform pg_temp.be((select mallory from probe_ids));

  begin perform public.join_couple('NOPE99');
  exception when others then get stacked diagnostics v_unknown = message_text; end;

  begin perform public.join_couple('PROBEX');
  exception when others then get stacked diagnostics v_expired = message_text; end;

  begin perform public.join_couple('PROBES');
  exception when others then get stacked diagnostics v_spent = message_text; end;

  if v_expired is distinct from v_unknown then
    raise exception 'FAIL: an expired code is distinguishable (% vs %)', v_expired, v_unknown;
  end if;
  if v_spent is distinct from v_unknown then
    raise exception 'FAIL: a spent code is distinguishable (% vs %)', v_spent, v_unknown;
  end if;
end $$;
rollback;

-- ==================================================================
-- 11. delete_account is service-role only, and the users grant holds
-- (20260808000006, 20260808000008)
-- ==================================================================
begin;
do $$
declare v_a uuid;
begin
  select alice into v_a from probe_ids;
  perform pg_temp.be((select mallory from probe_ids));

  begin
    perform public.delete_account(v_a);
    raise exception 'FAIL: a signed-in user can delete another account';
  exception when insufficient_privilege then null;
  end;

  -- The column grant: consent is writable by its owner, the email mirror is not.
  perform pg_temp.be(v_a);
  update public.users set accepted_terms_at = now() where id = v_a;

  begin
    update public.users set email = 'moved@pamwe.dev' where id = v_a;
    raise exception 'FAIL: a user can rewrite the email mirrored from auth.users';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ==================================================================
-- 12. mark_reveal_seen: mine only, sealed only, and by the function only
-- (20260810000001)
-- ==================================================================
begin;
do $$
declare v_a uuid; v_b uuid; v_cp uuid; v_seen timestamptz;
begin
  select alice, bob, couple_plan into v_a, v_b, v_cp from probe_ids;

  perform pg_temp.be(v_a);
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
  values (v_cp, 1, v_a, 'text', 'mine', now());
  -- A draft, left open, to test the column grant where the policy still allows
  -- an update at all.
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content)
  values (v_cp, 2, v_a, 'text', 'still writing');

  perform pg_temp.be(v_b);
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
  values (v_cp, 1, v_b, 'text', 'theirs', now());

  -- Alice marks her own copy of day 1.
  perform pg_temp.be(v_a);
  perform public.mark_reveal_seen(v_cp, 1);

  perform pg_temp.asowner();
  select reveal_seen_at into v_seen from public.entries
   where couple_plan_id = v_cp and day_number = 1 and user_id = v_a;
  if v_seen is null then
    raise exception 'FAIL: mark_reveal_seen did not mark the caller''s own entry';
  end if;

  -- and only her own: the partner still has their reveal waiting.
  select reveal_seen_at into v_seen from public.entries
   where couple_plan_id = v_cp and day_number = 1 and user_id = v_b;
  if v_seen is not null then
    raise exception 'FAIL: one partner marked the other''s reveal as seen';
  end if;

  -- An unsealed day is not a reveal, so there is nothing to mark.
  perform pg_temp.be(v_a);
  perform public.mark_reveal_seen(v_cp, 2);
  perform pg_temp.asowner();
  select reveal_seen_at into v_seen from public.entries
   where couple_plan_id = v_cp and day_number = 2 and user_id = v_a;
  if v_seen is not null then
    raise exception 'FAIL: an unsubmitted entry was marked as a watched reveal';
  end if;

  -- The function is the only writer. The policy would allow this update (the
  -- row is still a draft), so it is the column grant that has to refuse.
  perform pg_temp.be(v_a);
  begin
    update public.entries set reveal_seen_at = now()
     where couple_plan_id = v_cp and day_number = 2 and user_id = v_a;
    raise exception 'FAIL: reveal_seen_at is writable straight from the client';
  exception when insufficient_privilege then null;
  end;

  -- and the columns the journal really writes still are.
  update public.entries set text_content = 'more words', updated_at = now()
   where couple_plan_id = v_cp and day_number = 2 and user_id = v_a;

  -- Including the ones only an OLD build writes. Up to b23 the voice send
  -- attached audio and transcript inline to the draft and threw on failure, so
  -- a phone that has not updated would lose voice sending if this were revoked.
  update public.entries
     set entry_type = 'voice', audio_url = 'x/y/z.m4a', audio_duration_seconds = 12,
         transcript = 'what I said', updated_at = now()
   where couple_plan_id = v_cp and day_number = 2 and user_id = v_a;
end $$;
rollback;

-- ==================================================================
-- 13. switch_plan: one transaction, one active plan, and not for outsiders
-- (20260810000002)
-- ==================================================================
begin;
do $$
declare v_a uuid; v_couple uuid; v_other uuid; v_active int; v_row public.couple_plans;
begin
  select alice, couple into v_a, v_couple from probe_ids;
  -- A plan to switch TO. Made here rather than looked up, because the dev seed
  -- carries only M'Cheyne and the other curated plans come from separate
  -- scripts that a fresh machine has not run.
  insert into public.plans (title, duration_days, is_curated)
  values ('Probe plan', 7, true) returning id into v_other;

  -- An outsider cannot enrol a couple they are not in. SECURITY INVOKER, so
  -- couple_plans_insert is what refuses.
  perform pg_temp.be((select mallory from probe_ids));
  begin
    perform public.switch_plan(v_couple, v_other, 1);
    raise exception 'FAIL: an outsider started a plan for someone else''s couple';
  exception when insufficient_privilege then null;
  end;

  -- A rhythm the app does not offer is refused rather than stored.
  perform pg_temp.be(v_a);
  begin
    perform public.switch_plan(v_couple, v_other, 3);
    raise exception 'FAIL: switch_plan accepted a cadence of 3';
  exception when others then
    if sqlerrm not like '%Unknown rhythm%' then raise; end if;
  end;

  -- The switch itself: the old plan retires and the new one starts, together.
  v_row := public.switch_plan(v_couple, v_other, 2);
  if v_row.plan_id <> v_other or v_row.status <> 'active' or v_row.cadence_days <> 2 then
    raise exception 'FAIL: switch_plan returned %', v_row;
  end if;
  if v_row.current_day <> 1 then
    raise exception 'FAIL: the new plan started on day %', v_row.current_day;
  end if;
  -- start_date is the function's to decide now, not the device's.
  if v_row.start_date is null then
    raise exception 'FAIL: switch_plan left start_date null';
  end if;

  perform pg_temp.asowner();
  select count(*) into v_active from public.couple_plans
   where couple_id = v_couple and status = 'active';
  if v_active <> 1 then
    raise exception 'FAIL: the couple has % active plans after a switch', v_active;
  end if;
end $$;
rollback;

-- ==================================================================
-- 14. set_couple_anniversary still accepts null, which means "clear it"
--
-- Here because the generated Supabase types cannot express a nullable
-- argument: they widen p_anniversary to a plain string, so src/lib/couples.ts
-- casts past it. That cast is only safe while this holds.
-- ==================================================================
begin;
do $$
declare v_a uuid; v_stored date;
begin
  select alice into v_a from probe_ids;
  perform pg_temp.be(v_a);

  perform public.set_couple_anniversary('2024-06-01');
  perform pg_temp.asowner();
  select c.anniversary into v_stored from public.couples c
    join public.users u on u.couple_id = c.id where u.id = v_a;
  if v_stored is null then
    raise exception 'FAIL: set_couple_anniversary did not store a date';
  end if;

  perform pg_temp.be(v_a);
  perform public.set_couple_anniversary(null);
  perform pg_temp.asowner();
  select c.anniversary into v_stored from public.couples c
    join public.users u on u.couple_id = c.id where u.id = v_a;
  if v_stored is not null then
    raise exception 'FAIL: clearing the anniversary left % behind', v_stored;
  end if;

  -- and a future date is still refused, since the widget has no room to
  -- explain a negative day count.
  perform pg_temp.be(v_a);
  begin
    perform public.set_couple_anniversary(current_date + 1);
    raise exception 'FAIL: an anniversary in the future was accepted';
  exception when others then
    if sqlerrm not like '%future%' then raise; end if;
  end;
end $$;
rollback;

-- ==================================================================
-- 15. push_tokens: a device each, and nobody else's (20260811000001;
-- the legacy users.expo_push_token column dropped by 20260815000001)
-- ==================================================================
begin;
do $$
declare v_a uuid; v_b uuid; v_seen int; v_owner uuid;
begin
  select alice, bob into v_a, v_b from probe_ids;

  -- Alice signs in on two phones.
  perform pg_temp.be(v_a);
  perform public.save_push_token('ExponentPushToken[alice-phone]', 'ios');
  perform public.save_push_token('ExponentPushToken[alice-ipad]', 'ios');

  perform pg_temp.asowner();
  select count(*) into v_seen from public.push_tokens where user_id = v_a;
  if v_seen <> 2 then
    raise exception 'FAIL: a second device replaced the first (% rows)', v_seen;
  end if;

  -- Signing out on one phone leaves the other registered. The old code nulled
  -- the account's single column, silencing every device at once.
  perform pg_temp.be(v_a);
  perform public.clear_push_token('ExponentPushToken[alice-phone]');
  perform pg_temp.asowner();
  select count(*) into v_seen from public.push_tokens where user_id = v_a;
  if v_seen <> 1 then
    raise exception 'FAIL: signing out on one device left % rows', v_seen;
  end if;

  -- Claiming a handset releases it from whoever held it before. Hosted had two
  -- real accounts pointing at one token, from a sign-out that never let go, so
  -- one person's partner notifications were reaching a phone someone else uses.
  perform pg_temp.be(v_b);
  perform public.save_push_token('ExponentPushToken[shared-phone]', 'ios');
  perform pg_temp.be(v_a);
  perform public.save_push_token('ExponentPushToken[shared-phone]', 'ios');
  perform pg_temp.asowner();
  select user_id into v_owner from public.push_tokens
   where token = 'ExponentPushToken[shared-phone]';
  if v_owner is distinct from v_a then
    raise exception 'FAIL: a handset stayed registered to its previous account';
  end if;
  perform pg_temp.be(v_a);
  perform public.clear_push_token('ExponentPushToken[shared-phone]');

  -- A partner cannot read, plant or remove another person's devices.
  perform pg_temp.be(v_b);
  select count(*) into v_seen from public.push_tokens where user_id = v_a;
  if v_seen <> 0 then
    raise exception 'FAIL: one partner can list the other''s devices';
  end if;

  begin
    insert into public.push_tokens (token, user_id) values ('ExponentPushToken[forged]', v_a);
    raise exception 'FAIL: a token row was written straight from the client';
  exception when insufficient_privilege then null;
  end;

  perform public.clear_push_token('ExponentPushToken[alice-ipad]');
  perform pg_temp.asowner();
  select count(*) into v_seen from public.push_tokens where user_id = v_a;
  if v_seen <> 1 then
    raise exception 'FAIL: one partner removed the other''s device';
  end if;

  -- The registry has ONE home now. The legacy column and its sync function are
  -- really gone, so nothing is left for a client to write around push_tokens.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'expo_push_token'
  ) then
    raise exception 'FAIL: users.expo_push_token still exists';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'sync_legacy_push_token'
  ) then
    raise exception 'FAIL: sync_legacy_push_token still exists';
  end if;
end $$;
rollback;

-- ==================================================================
-- 16. activity_feed: the partner's motion, and only within the couple
-- (20260811000002)
-- ==================================================================
begin;
do $$
declare
  v_a uuid; v_b uuid; v_m uuid; v_c uuid; v_note uuid;
  v_total int; v_mine int; v_unread int;
begin
  select alice, bob, mallory, couple into v_a, v_b, v_m, v_c from probe_ids;

  -- Bob leaves things around the app; Alice leaves one of her own.
  perform pg_temp.be(v_b);
  insert into public.prayers (couple_id, author_id, text) values (v_c, v_b, 'for her interview');
  insert into public.dreams  (couple_id, author_id, text) values (v_c, v_b, 'a house by water');
  insert into public.verse_notes (couple_id, user_id, book, chapter, verse, text)
    values (v_c, v_b, 'John', 1, 1, 'the Word was God') returning id into v_note;
  insert into public.verse_note_responses (note_id, couple_id, user_id, kind, body)
    values (v_note, v_c, v_b, 'comment', 'this one stays with me');

  perform pg_temp.be(v_a);
  insert into public.prayers (couple_id, author_id, text) values (v_c, v_a, 'my own prayer');

  select count(*) into v_total from public.activity_feed(null, 40);
  select count(*) into v_mine from public.activity_feed(null, 40) f where f.actor_id = v_a;

  if v_mine <> 0 then
    raise exception 'FAIL: your own activity came back in your own feed';
  end if;
  if v_total <> 4 then
    raise exception 'FAIL: expected the partner''s 4 items, got %', v_total;
  end if;

  -- An outsider sees nothing: the function runs as the caller, so the couple
  -- policies on all five tables are what scope it.
  perform pg_temp.be(v_m);
  select count(*) into v_total from public.activity_feed(null, 40);
  if v_total <> 0 then
    raise exception 'FAIL: an outsider read % rows of a couple''s activity', v_total;
  end if;

  -- The dot: everything is unread until the list is opened.
  perform pg_temp.be(v_a);
  select public.unread_activity_count() into v_unread;
  if v_unread < 4 then
    raise exception 'FAIL: unread count was % with 4 new items', v_unread;
  end if;

  update public.users set last_seen_activity_at = now() where id = v_a;
  select public.unread_activity_count() into v_unread;
  if v_unread <> 0 then
    raise exception 'FAIL: the dot stayed lit after reading (%)', v_unread;
  end if;
end $$;
rollback;

-- ==================================================================
-- 17. search_verses reads Scripture, and Scripture stays read-only
-- (20260812000001)
-- ==================================================================
begin;
do $$
declare v_hits int; v_top record;
begin
  perform pg_temp.be((select mallory from probe_ids));

  -- Reference data: readable by any signed-in user, couple or not. An outsider
  -- SHOULD be able to search the Bible.
  select count(*) into v_hits from public.search_verses('praying without ceasing', 5);
  if v_hits < 1 then
    raise exception 'FAIL: a plain verse search found nothing';
  end if;

  select book, chapter, verse into v_top
  from public.search_verses('be still and know', 1);
  if v_top.book is distinct from 'Psalms' or v_top.chapter <> 46 or v_top.verse <> 10 then
    raise exception 'FAIL: ranking put % %:% first', v_top.book, v_top.chapter, v_top.verse;
  end if;

  -- A stray quote must not raise: websearch_to_tsquery tolerates what
  -- to_tsquery would reject, and a search box takes whatever is typed.
  perform public.search_verses('he said "peace" and', 5);
  select count(*) into v_hits from public.search_verses('   ', 5);
  if v_hits <> 0 then
    raise exception 'FAIL: an empty query returned % rows', v_hits;
  end if;

  -- and the catalogue is still nobody's to edit. RLS answers this one by
  -- matching no rows rather than by raising, because bible_verses carries a
  -- SELECT policy and nothing else.
  update public.bible_verses set text = 'tampered'
   where book = 'Psalms' and chapter = 46 and verse = 10;
  get diagnostics v_hits = row_count;
  if v_hits <> 0 then
    raise exception 'FAIL: a signed-in user rewrote Scripture';
  end if;
end $$;
rollback;

-- ==================================================================
-- 18. TRUNCATE is not a row operation, so RLS never sees it
-- (20260812000002)
--
-- Found while writing probe 17. Every table in the schema carried TRUNCATE,
-- TRIGGER and REFERENCES for anon and authenticated, from Supabase's own
-- `grant all` bootstrap. `truncate public.entries` as authenticated emptied
-- every reflection every couple has written, policies and all.
-- ==================================================================
begin;
do $$
declare v_left int;
begin
  perform pg_temp.be((select mallory from probe_ids));

  begin
    truncate public.entries cascade;
    raise exception 'FAIL: a signed-in user truncated every reflection in the app';
  exception when insufficient_privilege then null;
  end;

  begin
    truncate public.bible_verses cascade;
    raise exception 'FAIL: a signed-in user truncated the Bible';
  exception when insufficient_privilege then null;
  end;

  perform pg_temp.asowner();
  select count(*) into v_left from public.bible_verses;
  if v_left < 31000 then
    raise exception 'FAIL: the catalogue lost rows (% left)', v_left;
  end if;
end $$;
rollback;

-- ==================================================================
-- 19. The new notification controls are writable, and nothing else became
-- writable with them (20260813000001)
-- ==================================================================
begin;
do $$
declare v_a uuid; v_b uuid; v_pref text;
begin
  select alice, bob into v_a, v_b from probe_ids;
  perform pg_temp.be(v_a);

  update public.users
     set notification_morning = false, notification_preview = 'generic'
   where id = v_a;

  perform pg_temp.asowner();
  select notification_preview into v_pref from public.users where id = v_a;
  if v_pref is distinct from 'generic' then
    raise exception 'FAIL: the preview preference did not save (%)', v_pref;
  end if;

  -- The check constraint is what stops a modified client inventing a third
  -- setting the edge functions would not recognise and would treat as 'full'.
  perform pg_temp.be(v_a);
  begin
    update public.users set notification_preview = 'silent' where id = v_a;
    raise exception 'FAIL: an unknown preview setting was accepted';
  exception when check_violation then null;
  end;

  -- One person's lock screen is not another's to decide.
  update public.users set notification_preview = 'generic' where id = v_b;
  perform pg_temp.asowner();
  select notification_preview into v_pref from public.users where id = v_b;
  if v_pref is distinct from 'full' then
    raise exception 'FAIL: a partner changed the other''s preview setting';
  end if;
end $$;
rollback;


-- ==================================================================
-- 19. Pausing takes two (20260814000001)
-- ==================================================================
begin;
do $$
declare
  v_a uuid := (select alice from probe_ids);
  v_b uuid := (select bob from probe_ids);
  v_c uuid := (select couple from probe_ids);
  v_req public.couple_requests;
  v_paused timestamptz;
  v_open int;
begin
  perform pg_temp.asowner();
  delete from public.couple_requests where couple_id = v_c;
  delete from public.couple_pauses where couple_id = v_c;
  update public.couples set paused_at = null, paused_by = null where id = v_c;

  -- Alice asks.
  perform pg_temp.be(v_a);
  v_req := public.request_couple_change('pause');
  if v_req.status <> 'pending' then raise exception 'FAIL: the ask was not pending'; end if;

  -- Asking twice is the same ask, not a second one. A double tap on a slow
  -- connection must not leave a request the partner can never clear.
  if (public.request_couple_change('pause')).id <> v_req.id then
    raise exception 'FAIL: asking twice opened a second request';
  end if;

  -- The whole point: she cannot answer herself.
  begin
    perform public.respond_to_couple_request(v_req.id, true);
    raise exception 'FAIL: the person who asked was allowed to answer';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Nor can an outsider.
  perform pg_temp.be((select mallory from probe_ids));
  begin
    perform public.respond_to_couple_request(v_req.id, true);
    raise exception 'FAIL: an outsider answered a couple''s request';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  -- And cannot even see it.
  if exists (select 1 from public.couple_requests where id = v_req.id) then
    raise exception 'FAIL: an outsider could read a couple''s request';
  end if;

  -- The table takes no writes from the client, whoever they are.
  perform pg_temp.be(v_a);
  begin
    update public.couple_requests set status = 'accepted' where id = v_req.id;
    raise exception 'FAIL: a request was answered by writing the table directly';
  exception when insufficient_privilege then null;
  end;

  -- Bob agrees, and only then does anything change.
  perform pg_temp.be(v_b);
  perform pg_temp.asowner();
  select paused_at into v_paused from public.couples where id = v_c;
  if v_paused is not null then raise exception 'FAIL: the couple paused before anyone agreed'; end if;

  perform pg_temp.be(v_b);
  perform public.respond_to_couple_request(v_req.id, true);

  perform pg_temp.asowner();
  select paused_at into v_paused from public.couples where id = v_c;
  if v_paused is null then raise exception 'FAIL: agreeing did not pause the couple'; end if;
  select count(*) into v_open from public.couple_pauses where couple_id = v_c and ended_at is null;
  if v_open <> 1 then raise exception 'FAIL: expected exactly one open pause, got %', v_open; end if;

  -- Answering a settled request is not a second decision.
  perform pg_temp.be(v_b);
  begin
    perform public.respond_to_couple_request(v_req.id, false);
    raise exception 'FAIL: a settled request was answered again';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Coming back closes the interval rather than opening a second one.
  perform pg_temp.be(v_b);
  v_req := public.request_couple_change('restart');
  perform pg_temp.be(v_a);
  perform public.respond_to_couple_request(v_req.id, true);

  perform pg_temp.asowner();
  select paused_at into v_paused from public.couples where id = v_c;
  if v_paused is not null then raise exception 'FAIL: restarting left the couple paused'; end if;
  select count(*) into v_open from public.couple_pauses where couple_id = v_c and ended_at is null;
  if v_open <> 0 then raise exception 'FAIL: restarting left an open pause'; end if;
end $$;
rollback;

-- ==================================================================
-- 20. A pause does not break the streak (20260814000001)
-- ==================================================================
begin;
do $$
declare
  v_c uuid := (select couple from probe_ids);
  v_days int;
begin
  perform pg_temp.asowner();
  delete from public.couple_pauses where couple_id = v_c;

  -- Thirty days of pause sitting between two readings is thirty days the gap
  -- must not count, which is the whole promise of "your streak stays where it
  -- is". Measured through the function the streak actually calls.
  insert into public.couple_pauses (couple_id, started_at, ended_at)
  values (v_c, now() - interval '40 days', now() - interval '10 days');

  select public.paused_days_between(
    v_c, (now() - interval '45 days')::date, (now() - interval '5 days')::date, 'UTC'
  ) into v_days;

  if v_days < 29 or v_days > 31 then
    raise exception 'FAIL: a 30 day pause counted as % days', v_days;
  end if;

  -- A gap that does not overlap the pause is untouched.
  select public.paused_days_between(
    v_c, (now() - interval '4 days')::date, now()::date, 'UTC'
  ) into v_days;
  if v_days <> 0 then
    raise exception 'FAIL: a pause was subtracted from a gap it does not overlap (%)', v_days;
  end if;
end $$;
rollback;


-- ==================================================================
-- 21. Leaving keeps the archive, and keeps the locked reveal (20260814000002)
-- ==================================================================
begin;
do $$
declare
  v_a uuid := (select alice from probe_ids);
  v_b uuid := (select bob from probe_ids);
  v_m uuid := (select mallory from probe_ids);
  v_c uuid := (select couple from probe_ids);
  v_cp uuid;
  v_seen int;
  v_left timestamptz;
begin
  perform pg_temp.asowner();
  select id into v_cp from public.couple_plans where couple_id = v_c limit 1;
  if v_cp is null then raise exception 'probe fixtures missing: no couple_plan'; end if;

  delete from public.entries where couple_plan_id = v_cp and day_number in (901, 902);
  -- A day they BOTH wrote, and a day only Alice wrote.
  insert into public.entries (couple_plan_id, day_number, user_id, entry_type, text_content, submitted_at)
  values (v_cp, 901, v_a, 'text', 'mutual, alice', now()),
         (v_cp, 901, v_b, 'text', 'mutual, bob',   now()),
         (v_cp, 902, v_a, 'text', 'alice alone',   now());

  -- Alice leaves, with a note.
  perform pg_temp.be(v_a);
  perform public.leave_couple('Thank you for the year.');

  perform pg_temp.asowner();
  select left_at into v_left from public.couples where id = v_c;
  if v_left is null then raise exception 'FAIL: leaving did not seal the couple'; end if;

  -- BOTH are free, not just the one who tapped.
  if exists (select 1 from public.users where id in (v_a, v_b) and couple_id is not null) then
    raise exception 'FAIL: someone was left attached to a sealed couple';
  end if;

  -- The archive is still readable, by the one who left...
  perform pg_temp.be(v_a);
  if not exists (select 1 from public.couples where id = v_c) then
    raise exception 'FAIL: the leaver lost the archive';
  end if;
  select count(*) into v_seen from public.entries where couple_plan_id = v_cp and day_number in (901, 902);
  if v_seen <> 3 then
    raise exception 'FAIL: leaver saw % of her own 3 archived entries', v_seen;
  end if;

  -- ...and by the one who was left.
  perform pg_temp.be(v_b);
  if not exists (select 1 from public.couples where id = v_c) then
    raise exception 'FAIL: the partner lost the archive';
  end if;
  -- Bob wrote day 901 so he has earned both sides of it; he never wrote 902, so
  -- Alice's words there stay shut. Leaving is not a way to collect a reveal you
  -- did not earn.
  select count(*) into v_seen from public.entries where couple_plan_id = v_cp and day_number = 901;
  if v_seen <> 2 then raise exception 'FAIL: a sealed mutual day was not readable (% rows)', v_seen; end if;
  select count(*) into v_seen from public.entries where couple_plan_id = v_cp and day_number = 902;
  if v_seen <> 0 then
    raise exception 'FAIL: leaving unlocked a reflection the partner never earned (% rows)', v_seen;
  end if;

  -- A stranger gets nothing, archive or not.
  perform pg_temp.be(v_m);
  if exists (select 1 from public.couples where id = v_c) then
    raise exception 'FAIL: an outsider could read a sealed couple';
  end if;
  if exists (select 1 from public.entries where couple_plan_id = v_cp) then
    raise exception 'FAIL: an outsider could read archived reflections';
  end if;
  begin
    perform public.mark_farewell_read(v_c);
    raise exception 'FAIL: an outsider marked a farewell note read';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- A sealed couple takes no writes from anybody.
  perform pg_temp.be(v_b);
  begin
    update public.couples set left_at = null where id = v_c;
    raise exception 'FAIL: a sealed couple was un-sealed from the client';
  exception when insufficient_privilege then null;
  end;

  -- The note is for the person who did not write it, and is stamped once.
  perform pg_temp.be(v_a);
  perform public.mark_farewell_read(v_c);
  perform pg_temp.asowner();
  if (select farewell_read_at from public.couples where id = v_c) is not null then
    raise exception 'FAIL: the writer reading her own note counted as it being read';
  end if;

  perform pg_temp.be(v_b);
  perform public.mark_farewell_read(v_c);
  perform pg_temp.asowner();
  if (select farewell_read_at from public.couples where id = v_c) is null then
    raise exception 'FAIL: the note was never marked read';
  end if;
end $$;
rollback;

-- ==================================================================
-- 22. archive_summary answers only to the people in it (20260814000002)
-- ==================================================================
begin;
do $$
declare
  v_a uuid := (select alice from probe_ids);
  v_m uuid := (select mallory from probe_ids);
  v_c uuid := (select couple from probe_ids);
  v_notes int;
begin
  perform pg_temp.be(v_a);
  select notes into v_notes from public.archive_summary(v_c);
  if v_notes is null then raise exception 'FAIL: a partner got no summary of her own archive'; end if;

  -- Not an error, no rows: the count of somebody else's life is not a thing to
  -- answer at all, and a zero would still confirm the couple exists.
  perform pg_temp.be(v_m);
  if exists (select 1 from public.archive_summary(v_c)) then
    raise exception 'FAIL: an outsider was told how much a couple had written';
  end if;
end $$;
rollback;

-- ==================================================================
-- 23. A plan you may not read is a plan you may not enrol in (20260816000001)
-- ==================================================================
-- couple_plans_insert used to check couple_id and ignore plan_id, and
-- plans_select hands read access to any plan a couple is enrolled in. So
-- enrolling was a way to READ: name another couple's private plan by uuid and
-- its plan_days opened up, past the share_token / is_public gate.
begin;
do $$
declare
  v_a uuid := (select alice from probe_ids);
  v_couple uuid := (select couple from probe_ids);
  v_stranger_couple uuid;
  v_private uuid;
  v_shared uuid;
  v_curated uuid;
  v_days int;
begin
  -- A couple Alice is not in, and a plan of theirs she was never shown.
  insert into public.couples (invite_code, partner_a_id, timezone, invite_expires_at)
  values ('PROBE1', (select mallory from probe_ids), 'UTC', now() + interval '7 days')
  returning id into v_stranger_couple;

  insert into public.plans (title, duration_days, is_curated, couple_id, created_by)
  values ('Their private plan', 3, false, v_stranger_couple, (select mallory from probe_ids))
  returning id into v_private;
  insert into public.plan_days (plan_id, day_number, passage_reference, reflection_prompt)
  values (v_private, 1, 'John 1', 'What did you notice?');

  -- The same, but deliberately shared by its authors.
  insert into public.plans (title, duration_days, is_curated, couple_id, created_by, share_token)
  values ('Their shared plan', 3, false, v_stranger_couple, (select mallory from probe_ids), gen_random_uuid())
  returning id into v_shared;

  insert into public.plans (title, duration_days, is_curated)
  values ('A curated plan', 3, true) returning id into v_curated;

  perform pg_temp.be(v_a);

  -- The hole: a private plan nobody shared with her. Enrolled as 'completed'
  -- deliberately, so couple_plans_one_active cannot refuse it first and let
  -- this probe pass for a reason that has nothing to do with authorization.
  begin
    insert into public.couple_plans (couple_id, plan_id, start_date, current_day, cadence_days, status)
    values (v_couple, v_private, current_date, 1, 1, 'completed');
    raise exception 'FAIL: a couple enrolled in another couple''s private plan';
  exception when insufficient_privilege then null;
  end;

  -- And the read it was worth: still nothing, which is the point.
  select count(*) into v_days from public.plan_days where plan_id = v_private;
  if v_days <> 0 then
    raise exception 'FAIL: an unshared plan''s days are readable (% rows)', v_days;
  end if;

  -- switch_plan is SECURITY INVOKER, so the same policy has to refuse it there
  -- too. If this ever passes while the insert above fails, the RPC has grown a
  -- second authorization path.
  begin
    perform public.switch_plan(v_couple, v_private, 1);
    raise exception 'FAIL: switch_plan enrolled a couple in a private plan';
  exception when insufficient_privilege then null;
  end;

  -- What must keep working: a curated plan, and a plan whose authors shared it.
  -- pamwe://plan/<token> resolves through get_shared_plan and then enrols right
  -- here, so a refusal on this line is a broken share link, not a tighter app.
  insert into public.couple_plans (couple_id, plan_id, start_date, current_day, cadence_days, status)
  values (v_couple, v_curated, current_date, 1, 1, 'completed');

  insert into public.couple_plans (couple_id, plan_id, start_date, current_day, cadence_days, status)
  values (v_couple, v_shared, current_date, 1, 1, 'completed');

  -- And a couple's own plan, which is the ordinary case.
  perform pg_temp.asowner();
  insert into public.plans (title, duration_days, is_curated, couple_id, created_by)
  values ('Our own plan', 3, false, v_couple, v_a) returning id into v_private;
  perform pg_temp.be(v_a);
  insert into public.couple_plans (couple_id, plan_id, start_date, current_day, cadence_days, status)
  values (v_couple, v_private, current_date, 1, 1, 'completed');
end $$;
rollback;

-- ==================================================================
-- 24. An archive keeps both names, after the couple ends (20260816000002)
-- ==================================================================
-- leave_couple nulls couple_id on both partners and users_select_partner keys
-- on that column, so leaving made each ex-partner permanently nameless in the
-- other's archive: getProfile() returned null and the keepsake export said
-- "Your partner" where her name should be.
begin;
do $$
declare
  v_a uuid := (select alice from probe_ids);
  v_b uuid := (select bob from probe_ids);
  v_m uuid := (select mallory from probe_ids);
  v_name text;
begin
  perform pg_temp.be(v_a);
  perform public.leave_couple('goodbye');

  perform pg_temp.be(v_a);
  select display_name into v_name from public.users where id = v_b;
  if v_name is null then
    raise exception 'FAIL: after leaving, an ex-partner is nameless in her own archive';
  end if;

  -- And it reaches no further than the couple it is about.
  perform pg_temp.be(v_m);
  if exists (select 1 from public.users where id = v_b) then
    raise exception 'FAIL: the archive policy leaked a user row to an outsider';
  end if;
end $$;
rollback;

select 'rls_probe: all probes held' as result;
