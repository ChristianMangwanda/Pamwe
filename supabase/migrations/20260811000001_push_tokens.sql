-- One push token per ACCOUNT meant one phone per person.
--
-- users.expo_push_token is a single column, so registering on a second device
-- overwrote the first and the first silently stopped receiving anything. Worse,
-- signing out on one phone nulled the column for the whole account
-- (clearPushToken), so a sign-out here killed pushes there until that other
-- phone happened to relaunch and re-register.
--
-- Tokens belong to devices, so they get their own rows. The six notification_*
-- preferences stay on users, deliberately: those are a person's choices, not a
-- handset's.

create table if not exists public.push_tokens (
  -- The Expo token is the natural key: it identifies the installation, and a
  -- device that reinstalls or changes account must not leave a second row
  -- pointing at the same handset.
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Readable by its owner (so a device can confirm its own registration), and
-- written only by the two functions below. A client that could INSERT freely
-- could bind another person's token to itself; keeping writes in functions
-- means there is one place where that rule lives.
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.push_tokens from anon, authenticated;

-- ------------------------------------------------------------------
-- users.expo_push_token is kept in step, and stays the source the CURRENTLY
-- DEPLOYED edge functions read. Until they are redeployed to fan out over
-- push_tokens, this column is what makes a notification arrive at all, so it
-- must always name a live device.
--
-- It also means the multi-device sign-out fix works before those deploys: with
-- two phones registered, signing out on one leaves the other's token here
-- rather than null.
-- ------------------------------------------------------------------
create or replace function public.sync_legacy_push_token(p_user uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.users u
     set expo_push_token = (
       select t.token from public.push_tokens t
        where t.user_id = p_user
        order by t.updated_at desc
        limit 1
     )
   where u.id = p_user;
$$;

-- ------------------------------------------------------------------
-- save_push_token: this device now speaks for this account.
--
-- Any earlier row for the same token is replaced, which is what makes an
-- account switch on one handset land correctly: the token follows the device,
-- and the previous owner stops receiving pushes on hardware they no longer
-- hold. Note the token is a bearer string from Expo, unguessable in practice
-- but not a secret we verify: whoever presents one can bind it to themselves.
-- That is the same trust the single column already extended.
-- ------------------------------------------------------------------
create or replace function public.save_push_token(p_token text, p_platform text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(btrim(p_token), '') = '' then
    raise exception 'No token';
  end if;

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (btrim(p_token), v_uid, p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = coalesce(excluded.platform, public.push_tokens.platform),
        updated_at = now();

  perform public.sync_legacy_push_token(v_uid);
end;
$$;

-- ------------------------------------------------------------------
-- clear_push_token: this device is signing out.
--
-- Only this device's row goes. The account's other phones keep theirs, which is
-- the whole point: signing out on one handset used to silence every one.
-- ------------------------------------------------------------------
create or replace function public.clear_push_token(p_token text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_token is null then
    -- A device that never learned its own token (permission refused, simulator)
    -- has nothing of its own to remove, and must not take the account's other
    -- devices with it.
    perform public.sync_legacy_push_token(v_uid);
    return;
  end if;

  delete from public.push_tokens
   where token = btrim(p_token) and user_id = v_uid;

  perform public.sync_legacy_push_token(v_uid);
end;
$$;

revoke execute on function public.save_push_token(text, text) from public, anon;
revoke execute on function public.clear_push_token(text) from public, anon;
revoke execute on function public.sync_legacy_push_token(uuid) from public, anon, authenticated;
grant execute on function public.save_push_token(text, text) to authenticated;
grant execute on function public.clear_push_token(text) to authenticated;

-- Every token already registered becomes that account's first device row.
insert into public.push_tokens (token, user_id)
select u.expo_push_token, u.id
  from public.users u
 where u.expo_push_token is not null
on conflict (token) do nothing;
