-- Realtime on the verse marks so a partner's highlight or note appears while
-- the other is already looking at that chapter. Reading the same passage at the
-- same time is the case this is for: the reader refetched on focus only, so a
-- mark made a second after you opened the chapter stayed invisible until you
-- left and came back. Guarded so re-running never errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verse_highlights'
  ) then
    alter publication supabase_realtime add table public.verse_highlights;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verse_notes'
  ) then
    alter publication supabase_realtime add table public.verse_notes;
  end if;
end $$;
