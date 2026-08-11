-- A reveal one partner never watched is a moment the app quietly lost.
--
-- The day advances when EITHER partner taps Amen (reveal.tsx -> advancePlanDay).
-- That mechanic is deliberate and stays: the day should move once the reveal has
-- been read. What was missing is any record of WHO read it. "Seen" was a
-- device-local AsyncStorage flag (pamwe:revealSeen:<couple_plan>:<day>), so the
-- app knew only whether THIS phone had played the ceremony, and it forgot on
-- reinstall.
--
-- The cost was invisible because nothing was deleted. For a couple on pace, the
-- partner's Amen makes day N+1 openable immediately, so `closed` is false,
-- DayClosed never renders, and its re-read link is the ONLY route Today had back
-- to yesterday. The words were always still there (entries RLS keys on mutual
-- submit, not on current_day, and the reflect history lists every past day) but
-- the ceremony, and any sign that you had missed one, was not.
--
-- The marker lives on the viewer's OWN entry row: each partner marks their own
-- copy of the day, and neither can mark the other's.

alter table public.entries add column if not exists reveal_seen_at timestamptz;

-- ------------------------------------------------------------------
-- Why this is a function and not a column the client writes.
--
-- entries_update_own_draft is USING (user_id = auth.uid() AND submitted_at IS
-- NULL): once an entry is sealed it is invisible to every client UPDATE, which
-- is exactly the property that makes a reflection final. A reveal can only be
-- marked seen AFTER sealing, so the write cannot go through that policy, and
-- adding a second policy for sealed rows would reopen the sealed reflection
-- itself (WITH CHECK cannot compare the old row to the new one, so "you may
-- update a sealed row, but only this column" is not expressible in RLS).
--
-- So the write goes through a function whose body IS the authorization, the same
-- shape set_entry_transcript already uses for the same reason.
-- ------------------------------------------------------------------
create or replace function public.mark_reveal_seen(p_couple_plan uuid, p_day int)
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

  -- coalesce keeps the FIRST time: the ceremony's close can run twice across a
  -- remount, and the moment should keep the timestamp of the first watching.
  -- A row that is not mine, or not sealed, simply matches nothing.
  update public.entries
     set reveal_seen_at = coalesce(reveal_seen_at, now())
   where couple_plan_id = p_couple_plan
     and day_number = p_day
     and user_id = v_uid
     and submitted_at is not null;
end;
$$;

revoke execute on function public.mark_reveal_seen(uuid, int) from public, anon;
grant execute on function public.mark_reveal_seen(uuid, int) to authenticated;

-- ------------------------------------------------------------------
-- The function is the only writer.
--
-- A DRAFT row is still client-updatable by policy, so without this a client
-- could stamp reveal_seen_at on its own unsealed entry and skip its own
-- ceremony. That is self-harm rather than a breach, but the column belongs to
-- the function, and column-level privileges are how this schema already says
-- "any column except that one" (see 20260808000002 on public.users).
--
-- The list is every column src/lib/entries.ts updates: text_content and
-- updated_at (createOrUpdateDraft), submitted_at (submitEntry), entry_type
-- (ensureVoiceDraft), plus audio_url and audio_duration_seconds
-- (submitVoiceEntry).
--
-- transcript is in the list even though current code writes it only through
-- set_entry_transcript. Builds up to b23 attached it inline in
-- attachAudioToEntry, on the DRAFT row, before sealing: a path the policy
-- allows and that those builds throw on if it fails. A phone that has not
-- taken an update yet would lose voice sending altogether. The RPC exists to
-- reach a SEALED row, which no column grant opens, so keeping this here costs
-- nothing: the worst it permits is a user editing their own unsent draft.
-- ------------------------------------------------------------------
revoke update on public.entries from anon, authenticated;

grant update (
  text_content,
  entry_type,
  submitted_at,
  audio_url,
  audio_duration_seconds,
  transcript,
  updated_at
) on public.entries to authenticated;

-- ------------------------------------------------------------------
-- Backfill, so nobody is told they missed months of reveals on upgrade.
--
-- Every already-sealed day counts as seen, dated to the sealing. The one
-- exception is the day a couple is standing on right now: on an active plan,
-- days at or past current_day have not been amened, so if a reveal is genuinely
-- waiting this instant it stays waiting.
-- ------------------------------------------------------------------
update public.entries e
   set reveal_seen_at = e.submitted_at
  from public.couple_plans cp
 where cp.id = e.couple_plan_id
   and e.submitted_at is not null
   and e.reveal_seen_at is null
   and exists (
     select 1
       from public.entries partner
      where partner.couple_plan_id = e.couple_plan_id
        and partner.day_number = e.day_number
        and partner.user_id <> e.user_id
        and partner.submitted_at is not null
   )
   and not (cp.status = 'active' and e.day_number >= cp.current_day);
