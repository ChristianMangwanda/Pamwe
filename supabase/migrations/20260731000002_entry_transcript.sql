-- Let a voice entry's transcript land after the entry is sealed.
--
-- Sending a voice reflection used to wait for on-device transcription before
-- it would seal, and that recognizer runs over the whole recording with a 45
-- second ceiling. So the slowest part of sending was a field the schema calls
-- optional and the client documents as best-effort.
--
-- The entry can now seal as soon as the audio is up, with the transcript
-- following a moment later. That write needs a function because
-- entries_update_own_draft is USING (submitted_at IS NULL): once sealed, the
-- author cannot touch the row, and an UPDATE would match zero rows and report
-- success having done nothing.
--
-- Deliberately narrower than a policy would be. It writes one column, only on
-- the caller's own entry, and only while that column is still null, so it can
-- never be used to revise a reflection after the fact. Sealed still means
-- sealed.

create or replace function public.set_entry_transcript(p_entry_id uuid, p_transcript text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update entries
     set transcript = p_transcript
   where id = p_entry_id
     and user_id = (select auth.uid())
     and transcript is null;
end;
$$;

revoke execute on function public.set_entry_transcript(uuid, text) from public, anon;
grant execute on function public.set_entry_transcript(uuid, text) to authenticated;
