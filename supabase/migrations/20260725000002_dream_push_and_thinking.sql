-- Two one-tap pushes: a dream your partner just wrote, and "thinking of you".
--
-- 1. notification_dream pref. The existing toggles are narrowly worded
--    ("When your partner submits and both reflections unlock", "When your
--    partner adds a prayer point"), so folding dreams into either would make
--    the Settings screen lie about what it controls. Dreams get their own.
alter table public.users
  add column if not exists notification_dream boolean not null default true;

-- 2. New dream -> notify the partner. Mirrors notify_on_new_prayer exactly:
--    INSERT-only by construction, so editing a dream never re-notifies, and it
--    silently no-ops until notify_config() has a URL and key.
create or replace function public.notify_on_new_dream()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text;
begin
  select nc.url, nc.key into v_url, v_key from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-dream',
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
revoke execute on function public.notify_on_new_dream() from public, anon, authenticated;

drop trigger if exists notify_new_dream_trigger on public.dreams;
create trigger notify_new_dream_trigger
  after insert on public.dreams
  for each row execute function public.notify_on_new_dream();

-- 3. "Thinking of you" reuses the nudge cooldown table, but the two must not
--    share a cooldown: being told to read and being thought of are different
--    messages, and one should never silence the other. `kind` splits them.
--    Existing rows are all read-nudges, which the default backfills.
alter table public.partner_nudges
  add column if not exists kind text not null default 'nudge'
    check (kind in ('nudge', 'thinking'));

-- The cooldown lookup is now per sender per kind.
create index if not exists idx_partner_nudges_from_kind
  on public.partner_nudges(from_user, kind, created_at desc);
