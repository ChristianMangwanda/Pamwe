-- Response rows carry a copy of where they belong, and nothing checked the copy
-- against the parent.
--
-- entry_responses stores entry_id AND couple_plan_id AND day_number. The insert
-- policy validates entry_id (and, for a reply, that parent_id sits on the same
-- entry), but never that the pair of routing columns describes that entry's day.
-- Reads key on exactly those two columns (getResponsesForDay, and the SELECT
-- policy itself), so a user with any legitimate entry of their own could write a
-- reply that passed every check and then rendered inside ANOTHER couple's reveal.
--
-- verse_note_responses is the same shape one level worse: its insert policy checks
-- only that couple_id is yours, and never looks at note_id at all.
--
-- Policies are the wrong tool for this. "These duplicated columns must agree with
-- the row they point at" is a foreign key, so make it one: reference the parent by
-- the whole tuple, and the two can no longer disagree.
--
-- Run before applying (all three counts must be 0; nonzero means real rows would
-- be rejected and need reconciling first):
--
--   select 'entry_responses vs entries' as src, count(*) from public.entry_responses r
--     join public.entries e on e.id = r.entry_id
--     where r.couple_plan_id <> e.couple_plan_id or r.day_number <> e.day_number
--   union all
--   select 'entry_responses vs parent', count(*) from public.entry_responses r
--     join public.entry_responses p on p.id = r.parent_id
--     where r.couple_plan_id <> p.couple_plan_id or r.day_number <> p.day_number
--   union all
--   select 'verse_note_responses vs notes', count(*) from public.verse_note_responses vr
--     join public.verse_notes vn on vn.id = vr.note_id
--     where vr.couple_id <> vn.couple_id;

-- ------------------------------------------------------------------
-- entry_responses -> entries
-- ------------------------------------------------------------------
alter table public.entries
  add constraint entries_id_cp_day_key unique (id, couple_plan_id, day_number);

alter table public.entry_responses
  drop constraint if exists entry_responses_entry_id_fkey;

alter table public.entry_responses
  add constraint entry_responses_entry_fkey
  foreign key (entry_id, couple_plan_id, day_number)
  references public.entries (id, couple_plan_id, day_number)
  on delete cascade;

-- ------------------------------------------------------------------
-- entry_responses -> its own parent, for reply chains. parent_id is nullable and
-- the default MATCH SIMPLE means a top-level response (null parent) still passes.
-- ------------------------------------------------------------------
alter table public.entry_responses
  add constraint entry_responses_id_cp_day_key unique (id, couple_plan_id, day_number);

alter table public.entry_responses
  drop constraint if exists entry_responses_parent_id_fkey;

alter table public.entry_responses
  add constraint entry_responses_parent_fkey
  foreign key (parent_id, couple_plan_id, day_number)
  references public.entry_responses (id, couple_plan_id, day_number)
  on delete cascade;

-- ------------------------------------------------------------------
-- verse_note_responses -> verse_notes
-- ------------------------------------------------------------------
alter table public.verse_notes
  add constraint verse_notes_id_couple_key unique (id, couple_id);

alter table public.verse_note_responses
  drop constraint if exists verse_note_responses_note_id_fkey;

alter table public.verse_note_responses
  add constraint verse_note_responses_note_fkey
  foreign key (note_id, couple_id)
  references public.verse_notes (id, couple_id)
  on delete cascade;

-- Each edge now has exactly one authoritative constraint (the composite replaces
-- the single-column FK rather than sitting beside it), and every ON DELETE stays
-- CASCADE, which is what all three carried before.
