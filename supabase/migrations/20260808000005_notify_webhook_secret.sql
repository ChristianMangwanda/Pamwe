-- The notify-* functions are webhook targets, so they run with verify_jwt = false
-- and the gateway lets anyone reach them. Nothing else checked either: each one
-- read `record` straight off the request body and pushed with the service role.
-- Two of them put that body's text on a partner's lock screen verbatim, and one
-- let the caller choose which name the push was attributed to.
--
-- The triggers already send `Authorization: Bearer <service_role_key>`, but with
-- verify_jwt off nothing reads it, so it proves nothing. This adds a header the
-- functions DO check, from the same place the URL and key already come from.
--
-- The secret lives beside the other two: GUC app.settings.notify_webhook_secret
-- for local, Vault secret notify_webhook_secret for hosted. Adding an OUT
-- parameter changes the function's return type, so notify_config has to be
-- dropped and recreated rather than replaced, and the REVOKE has to be
-- re-asserted afterwards: a fresh function is EXECUTE-able by PUBLIC by default,
-- and this one hands back the service-role key.

drop function if exists public.notify_config();

create function public.notify_config(out url text, out key text, out secret text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  url    := current_setting('app.settings.supabase_url', true);
  key    := current_setting('app.settings.service_role_key', true);
  secret := current_setting('app.settings.notify_webhook_secret', true);
  if url is null or key is null or secret is null then
    begin
      select ds.decrypted_secret into url    from vault.decrypted_secrets ds where ds.name = 'notify_supabase_url';
      select ds.decrypted_secret into key    from vault.decrypted_secrets ds where ds.name = 'notify_service_role_key';
      select ds.decrypted_secret into secret from vault.decrypted_secrets ds where ds.name = 'notify_webhook_secret';
    exception when others then
      url := null; key := null; secret := null;
    end;
  end if;
end;
$$;

-- This function returns the service key — API roles must never call it.
revoke execute on function public.notify_config() from public, anon, authenticated;

-- ------------------------------------------------------------------
-- The six webhook triggers. Each is its current body (20260709000006 for the
-- first two, 20260725000002, 20260726000001, 20260802000004, 20260807000002)
-- with one change: the headers are built up first, and x-webhook-secret is added
-- only when there is one. A half-configured stack must not post the string
-- "null" as its credential.
-- The triggers themselves are untouched, so their WHEN clauses still apply.
-- ------------------------------------------------------------------
create or replace function public.notify_on_entry_submit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  if old.submitted_at is null and new.submitted_at is not null then
    select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
    if v_url is not null and v_key is not null then
      v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
      if v_secret is not null then
        v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
      end if;
      perform net.http_post(
        url := v_url || '/functions/v1/notify-partner',
        headers := v_headers,
        body := jsonb_build_object('record', row_to_json(new))
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_prayer()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-prayer',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_dream()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-dream',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_response()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-response',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_verse_note()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-note',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_verse_comment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-verse-comment',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

-- Function hygiene (matches 20260709000005): no API-role EXECUTE on triggers.
revoke execute on function public.notify_on_entry_submit() from public, anon, authenticated;
revoke execute on function public.notify_on_new_prayer() from public, anon, authenticated;
revoke execute on function public.notify_on_new_dream() from public, anon, authenticated;
revoke execute on function public.notify_on_new_response() from public, anon, authenticated;
revoke execute on function public.notify_on_new_verse_note() from public, anon, authenticated;
revoke execute on function public.notify_on_new_verse_comment() from public, anon, authenticated;
