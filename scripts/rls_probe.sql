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
-- 15. push_tokens: a device each, and nobody else's (20260811000001)
-- ==================================================================
begin;
do $$
declare v_a uuid; v_b uuid; v_seen int; v_legacy text;
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

  -- The legacy column still names a live device, which is what the currently
  -- deployed edge functions read.
  select expo_push_token into v_legacy from public.users where id = v_a;
  if v_legacy is null then
    raise exception 'FAIL: the legacy push column was left empty';
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
  select expo_push_token into v_legacy from public.users where id = v_a;
  if v_legacy is distinct from 'ExponentPushToken[alice-ipad]' then
    raise exception 'FAIL: the legacy column did not fall back to the remaining device (%)', v_legacy;
  end if;

  -- Claiming a handset releases it from whoever held it before. Hosted had two
  -- real accounts pointing at one token, from a sign-out that never let go, so
  -- one person's partner notifications were reaching a phone someone else uses.
  perform pg_temp.asowner();
  update public.users set expo_push_token = 'ExponentPushToken[shared-phone]' where id = v_b;
  perform pg_temp.be(v_a);
  perform public.save_push_token('ExponentPushToken[shared-phone]', 'ios');
  perform pg_temp.asowner();
  select expo_push_token into v_legacy from public.users where id = v_b;
  if v_legacy is not null then
    raise exception 'FAIL: a handset stayed registered to its previous account (%)', v_legacy;
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

  -- The legacy sync is internal: a signed-in user must not be able to point
  -- somebody else's push column wherever they like.
  perform pg_temp.be(v_b);
  begin
    perform public.sync_legacy_push_token(v_a);
    raise exception 'FAIL: sync_legacy_push_token is callable by a signed-in user';
  exception when insufficient_privilege then null;
  end;
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

select 'rls_probe: all probes held' as result;
