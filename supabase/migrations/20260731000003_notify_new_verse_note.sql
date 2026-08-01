-- Tell your partner when you take note of a verse.
--
-- A verse note is not a reflection: it is not sealed, there is nothing to wait
-- for, and the couple already share one note per verse. So it does not belong
-- in the locked-reveal machinery. It is just worth knowing that the other
-- person marked something.
--
-- INSERT-only, by construction. saveNote() upserts on
-- (couple_id, book, chapter, verse), so the first note on a verse is an INSERT
-- and every later edit is an UPDATE. Firing only on INSERT means a note that
-- gets reworded a few times still buzzes the phone exactly once. Christian's
-- call, 2026-07-31.
--
-- Same GUC guard as the other notify triggers, so writing a note locally never
-- depends on push wiring being configured.

alter table public.users
  add column if not exists notification_note boolean not null default true;

create or replace function public.notify_on_new_verse_note()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text;
begin
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);
  if v_url is not null and v_key is not null then
    perform net.http_post(
      url := v_url || '/functions/v1/notify-new-note',
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

drop trigger if exists notify_new_verse_note_trigger on public.verse_notes;
create trigger notify_new_verse_note_trigger
  after insert on public.verse_notes
  for each row execute function public.notify_on_new_verse_note();
