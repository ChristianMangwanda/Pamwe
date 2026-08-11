-- The legacy push-token column retires.
--
-- push_tokens (20260811000001) has been the real registry since b26, and
-- users.expo_push_token was kept in step only so functions deployed before the
-- fan-out kept delivering. Both phones run b27+ now (confirmed 2026-08-11), the
-- client writes only push_tokens, and every notify function was redeployed to
-- read push_tokens alone BEFORE this migration runs. Order matters: a deployed
-- function that still selects this column would 500 on every notification the
-- moment the column drops.
--
-- The RPCs lose their sync calls, sync_legacy_push_token goes, and the column
-- goes last (its column-level UPDATE grant disappears with it).

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

  -- The token is the natural key; claiming a device releases it from whoever
  -- held it before, which is what makes an account switch on one handset land
  -- correctly (see 20260811000001 for the two-accounts-one-phone incident).
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (btrim(p_token), v_uid, p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = coalesce(excluded.platform, public.push_tokens.platform),
        updated_at = now();
end;
$$;

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

  -- A device that never learned its own token (permission refused, simulator)
  -- has nothing of its own to remove, and must not take the account's other
  -- devices with it.
  if p_token is null then
    return;
  end if;

  delete from public.push_tokens
   where token = btrim(p_token) and user_id = v_uid;
end;
$$;

drop function if exists public.sync_legacy_push_token(uuid);

alter table public.users drop column if exists expo_push_token;
