-- Deleting your account must always finish, whatever you have made.
--
-- Three foreign keys pointed at auth.users with NO ACTION while the
-- delete-account routine never cleared the rows holding them. So the final
-- auth-row delete raised a violation and the whole request 500'd: anyone who
-- had built one plan or marked one verse could not delete their account. That
-- is a broken promise on the privacy screen and an App Store requirement
-- (guideline 5.1.1(v)) at the same time.
--
-- Reproduced 2026-08-02 against a local copy, in a rolled-back transaction:
-- plans_created_by_fkey raises first, then verse_highlights_user_id_fkey, then
-- verse_notes_user_id_fkey. Each one on its own is enough to block deletion.
--
-- Two rules decide what each key becomes, and they are the same two rules the
-- delete-account function already follows:
--
--   * A departing user's OWN content goes with them. Their verse highlights
--     and verse notes are theirs, so those CASCADE.
--   * The SURVIVING partner never loses anything. A plan the couple built is
--     read by both of them and may be the survivor's active enrollment, so
--     created_by drops to NULL and the plan itself stays. Authorship is the
--     only thing that leaves.
--
-- The delete-account function also deletes the verse rows explicitly, so the
-- promise is legible in the routine rather than resting on FK semantics alone.
-- These constraints are the backstop that keeps a future gap from turning into
-- another undeletable account.

alter table public.plans
  drop constraint if exists plans_created_by_fkey;
alter table public.plans
  add constraint plans_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.verse_highlights
  drop constraint if exists verse_highlights_user_id_fkey;
alter table public.verse_highlights
  add constraint verse_highlights_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.verse_notes
  drop constraint if exists verse_notes_user_id_fkey;
alter table public.verse_notes
  add constraint verse_notes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
