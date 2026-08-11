-- Pairing moves off direct table writes and behind three functions.
--
-- What was wrong (security review, 2026-08-08):
--   • couples_select_by_invite carried no invite-code and no auth.uid() term, so
--     ANY signed-in user could `select * from couples` and read every pending
--     invite code in the app. The code was only ever a client-side .eq() filter;
--     the database never saw it as an authorization factor.
--   • couples_update_join let that same user write partner_b_id onto any pending
--     couple WITHOUT the code, and its WITH CHECK constrained only the two
--     partner columns, so the same statement could also rewrite invite_code,
--     invite_expires_at, timezone, anniversary and the streak columns.
--   • The client did find / claim / users.couple_id in three separate calls, so a
--     drop between the second and third left a couple paired with the joiner's
--     profile still unlinked, and two devices could race the same code.
--
-- The fix is to make the code a real credential: nothing about pending couples is
-- selectable or writable through the API any more, and joining happens inside one
-- locked transaction that must be handed the code to do anything at all.
--
-- Old app builds lose pairing (they call the dropped policies). That is accepted:
-- every existing couple is already paired, and paired rows are untouched here.

-- ------------------------------------------------------------------
-- Invite codes are generated in the database from a CSPRNG.
-- Math.random() on the client was not one, and the code is a bearer credential
-- for a partner's private reflections, prayers and dreams.
-- 32-symbol alphabet (no I/O/0/1), so % 32 over a byte is unbiased.
-- ------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(6);
  v_code text := '';
  i int;
begin
  for i in 0..5 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_code;
end;
$$;

revoke execute on function public.generate_invite_code() from public, anon, authenticated;

-- ------------------------------------------------------------------
-- create_couple: partner A opens an invite.
-- The couple row and the profile link are written together, and the code and its
-- expiry are decided here, not sent by the device (a modified client could
-- previously post an invite that never expired).
-- ------------------------------------------------------------------
create or replace function public.create_couple(p_timezone text default 'UTC')
returns public.couples
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing uuid;
  v_couple public.couples;
  v_tz text;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into v_existing from public.users where id = v_uid;
  if v_existing is not null then
    raise exception 'You are already connected to a partner';
  end if;

  -- The timezone is still captured on the device (Intl only exists there), but an
  -- unknown string would break compute_streak's `at time zone` for good.
  v_tz := coalesce(nullif(btrim(p_timezone), ''), 'UTC');
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.couples (invite_code, invite_expires_at, partner_a_id, timezone)
      values (public.generate_invite_code(), now() + interval '7 days', v_uid, v_tz)
      returning * into v_couple;
      exit;
    exception when unique_violation then
      -- invite_code collision: draw again.
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  update public.users set couple_id = v_couple.id where id = v_uid;

  return v_couple;
end;
$$;

-- ------------------------------------------------------------------
-- join_couple: partner B spends the code.
-- FOR UPDATE holds the row, so two devices entering the same code cannot both
-- pass the unpaired check. Both writes commit together or neither does.
-- ------------------------------------------------------------------
create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing uuid;
  v_couple public.couples;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select couple_id into v_existing from public.users where id = v_uid;
  if v_existing is not null then
    raise exception 'You are already connected to a partner';
  end if;

  select * into v_couple
  from public.couples
  where invite_code = upper(btrim(coalesce(p_code, '')))
  for update;

  -- Unknown, already spent and expired all answer the same way on purpose: a
  -- caller must not be able to tell a real code from a dead one. This string is
  -- shown to the user verbatim (join.tsx alerts e.message).
  if not found
     or v_couple.partner_b_id is not null
     or v_couple.invite_expires_at <= now() then
    raise exception 'That code didn''t work. Check it with your partner and try again.';
  end if;

  if v_couple.partner_a_id = v_uid then
    raise exception 'You can''t join your own invite';
  end if;

  update public.couples
     set partner_b_id = v_uid,
         paired_at = now()
   where id = v_couple.id
  returning * into v_couple;

  update public.users set couple_id = v_couple.id where id = v_uid;

  return v_couple;
end;
$$;

-- ------------------------------------------------------------------
-- regenerate_invite_code: #18's lapsed-code escape hatch.
-- The couple is derived from the caller, so there is no id to pass and no id to
-- tamper with.
-- ------------------------------------------------------------------
create or replace function public.regenerate_invite_code()
returns public.couples
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple public.couples;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_couple
  from public.couples
  where partner_a_id = v_uid and partner_b_id is null
  for update;

  if not found then
    raise exception 'No invite to refresh';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      update public.couples
         set invite_code = public.generate_invite_code(),
             invite_expires_at = now() + interval '7 days'
       where id = v_couple.id
      returning * into v_couple;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  return v_couple;
end;
$$;

revoke execute on function public.create_couple(text) from public, anon;
revoke execute on function public.join_couple(text) from public, anon;
revoke execute on function public.regenerate_invite_code() from public, anon;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.regenerate_invite_code() to authenticated;

-- ------------------------------------------------------------------
-- The holes themselves.
-- couples_select_own stays and is the only SELECT left: it is what the invite
-- screen's realtime channel and CoupleProvider read their own row through, so
-- pairing detection is unaffected.
-- ------------------------------------------------------------------
drop policy if exists "couples_select_by_invite" on public.couples;
drop policy if exists "couples_update_join" on public.couples;
drop policy if exists "couples_update_regenerate_invite" on public.couples;
drop policy if exists "couples_insert" on public.couples;

-- Belt as well as braces: with no INSERT/UPDATE policy left, the table-level
-- privilege is the only thing a future policy could build on. (20260708000004
-- granted these to anon and authenticated across the whole schema.)
revoke insert, update on public.couples from anon, authenticated;
