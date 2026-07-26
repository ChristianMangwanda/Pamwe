-- Replying to a partner's revealed reflection was completely silent: there was
-- no trigger, no webhook and no function for entry_responses, so the only way
-- to find a reply was to reopen the reveal and look.
--
-- Mirrors notify_on_new_prayer: INSERT-only by construction, so editing never
-- re-notifies, and a silent no-op until notify_config() has a URL and key.
--
-- The WHEN clause keeps hearts and amens out entirely. Those are ambient by
-- design; a banner per tap would turn the warmest part of the ritual into
-- noise, and filtering here means the function is never even woken for them.

create or replace function public.notify_on_new_response()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text;
begin
  select nc.url, nc.key into v_url, v_key from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-response',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

-- Function hygiene (matches 20260709000005): no API-role EXECUTE on triggers.
revoke execute on function public.notify_on_new_response() from public, anon, authenticated;

drop trigger if exists notify_new_response_trigger on public.entry_responses;
create trigger notify_new_response_trigger
  after insert on public.entry_responses
  for each row
  when (new.kind = 'reply')
  execute function public.notify_on_new_response();
