-- Realtime on entry_responses so a partner's heart or reply appears live on
-- the reveal and reflect-detail screens without reopening them. Guarded so
-- re-running never errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entry_responses'
  ) then
    alter publication supabase_realtime add table public.entry_responses;
  end if;
end $$;
