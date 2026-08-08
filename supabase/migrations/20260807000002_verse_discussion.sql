-- A note on a verse was a dead end: one shared note per verse per couple, which
-- either partner could overwrite, and no way to say anything back to it.
-- Christian's note, 2026-08-07: "I should be able to react, maybe comment, on a
-- comment my partner made on a verse."
--
-- The note itself is unchanged, deliberately: it stays ONE note the couple keeps
-- on that verse, shared and either-of-you editable, which is what the study layer
-- has always been. What lands here is everything said BACK to it. The note is the
-- topic; these are the discussion.
--
-- Comments are flat on purpose. The reflection chain nests, because a day's
-- reflection is a conversation between two people; a verse note is a thing the
-- couple is looking at together, and a page of remarks under it reads better
-- than a tree.

create table if not exists public.verse_note_responses (
  id uuid primary key default gen_random_uuid(),
  -- The note row survives an edit (saveNote upserts, so the id is stable), and
  -- deleting the note takes its discussion with it. The note is the topic.
  note_id uuid not null references public.verse_notes(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('heart', 'amen', 'comment')),
  body text check (body is null or char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_verse_note_responses_note on public.verse_note_responses(note_id, created_at);

-- Reactions toggle, so one per person per kind. Comments repeat freely.
create unique index if not exists uq_verse_note_reaction
  on public.verse_note_responses(note_id, user_id, kind)
  where kind in ('heart', 'amen');

-- A comment must actually say something; a reaction must not pretend to.
alter table public.verse_note_responses drop constraint if exists verse_note_responses_body_matches_kind;
alter table public.verse_note_responses add constraint verse_note_responses_body_matches_kind
  check (
    case kind
      when 'comment' then body is not null and char_length(btrim(body)) > 0
      else body is null
    end
  );

alter table public.verse_note_responses enable row level security;

-- Couple-scoped, the same direct-subquery idiom as verse_notes and prayers: no
-- self reference, so no recursion (trial-and-error.md, "RLS infinite recursion").
drop policy if exists "verse_note_responses_select" on public.verse_note_responses;
create policy "verse_note_responses_select" on public.verse_note_responses
  for select to authenticated using (
    couple_id in (
      select c.id from public.couples c
      where c.partner_a_id = (select auth.uid()) or c.partner_b_id = (select auth.uid())
    )
  );

drop policy if exists "verse_note_responses_insert" on public.verse_note_responses;
create policy "verse_note_responses_insert" on public.verse_note_responses
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and couple_id in (
      select c.id from public.couples c
      where c.partner_a_id = (select auth.uid()) or c.partner_b_id = (select auth.uid())
    )
  );

-- Your words, yours to remove. Unlike the note itself, which the couple shares,
-- a comment is one person speaking and the other cannot edit or delete it.
drop policy if exists "verse_note_responses_update" on public.verse_note_responses;
create policy "verse_note_responses_update" on public.verse_note_responses
  for update to authenticated using (user_id = (select auth.uid()));

drop policy if exists "verse_note_responses_delete" on public.verse_note_responses;
create policy "verse_note_responses_delete" on public.verse_note_responses
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.verse_note_responses to authenticated;

-- Live, so a comment appears while you are both on the same verse. verse_notes
-- and verse_highlights joined the publication on 2026-08-02 for the same reason.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verse_note_responses'
  ) then
    alter publication supabase_realtime add table public.verse_note_responses;
  end if;
end $$;

-- Push, same shape as notify_on_new_response: INSERT only, so an edit never
-- re-notifies, and the WHEN clause keeps hearts and amens out entirely. Reading
-- the URL and key through notify_config() rather than a GUC, which is what kept
-- the note push from ever firing on hosted (b22).
create or replace function public.notify_on_new_verse_comment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text;
begin
  select nc.url, nc.key into v_url, v_key from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    perform net.http_post(
      url := v_url || '/functions/v1/notify-verse-comment',
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

revoke execute on function public.notify_on_new_verse_comment() from public, anon, authenticated;

drop trigger if exists notify_new_verse_comment_trigger on public.verse_note_responses;
create trigger notify_new_verse_comment_trigger
  after insert on public.verse_note_responses
  for each row
  when (new.kind = 'comment')
  execute function public.notify_on_new_verse_comment();
