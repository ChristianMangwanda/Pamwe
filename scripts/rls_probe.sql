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

select 'rls_probe: all probes held' as result;
