-- P1 security hardening from the 2026-07-09 debug tour (#8, #9, #12, #13, #14).

-- #8: pending couples were readable with the anon key alone — both invite
-- policies were TO public with no auth.uid() in the predicate (verified: anon
-- could read invite_code + partner_a_id of every pending couple). The app only
-- ever runs these queries as a signed-in user.
alter policy couples_select_by_invite on public.couples to authenticated;
alter policy couples_update_join on public.couples to authenticated;

-- #9: prayers_insert only checked authorship, not couple membership — any
-- authenticated user could inject a prayer into a stranger's couple feed.
alter policy prayers_insert on public.prayers
  with check (
    author_id = (select auth.uid())
    and couple_id in (
      select c.id from public.couples c
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

-- #14: same class for prayer_marks — the marked prayer must belong to the
-- caller's couple.
alter policy prayer_marks_insert on public.prayer_marks
  with check (
    user_id = (select auth.uid())
    and prayer_id in (
      select p.id from public.prayers p
      join public.couples c on p.couple_id = c.id
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

-- #12: pin search_path on the two SECURITY DEFINER functions that lacked it
-- (the other five helpers already pin it; bodies are schema-qualified, so this
-- is safe). Clears the Supabase function_search_path_mutable advisor finding.
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.notify_on_entry_submit() set search_path = public, pg_temp;

-- #13: voice uploads could use a non-numeric day segment, which aborts the
-- partner's reveal-time storage query when the SELECT policy casts it ::int.
-- Require the exact path shape {couple_plan_id}/{day_number}/{uid}.m4a.
alter policy voice_insert_own on storage.objects
  with check (
    bucket_id = 'voice-entries'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^\d+$'
    and split_part(storage.filename(name), '.', 1) = (auth.uid())::text
    and (storage.foldername(name))[1] in (
      select cp.id::text
      from public.couple_plans cp
      join public.couples c on cp.couple_id = c.id
      where c.partner_a_id = auth.uid()
         or c.partner_b_id = auth.uid()
    )
  );
