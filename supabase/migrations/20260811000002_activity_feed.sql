-- What happened while you were away had no home in the app.
--
-- Delivered notifications are dismissed on every foreground
-- (clearDeliveredNotifications, and that stays: stacked-up banners read as if
-- the same thing keeps happening). But that made the OS notification list the
-- only record of a reply, a new prayer, a dream or a note, so opening the app
-- erased the only trail there was. Anything you did not read in time was gone.
--
-- This is derived, never stored: one function that unions what the five tables
-- already record, under the caller's own RLS. A stored events table would be a
-- second copy of the truth that can drift from it, and would need triggers,
-- backfill and its own retention. Streaks, the Grove count and justPlanted are
-- all computed the same way and for the same reason.

alter table public.users add column if not exists last_seen_activity_at timestamptz;

-- The unread dot is the user's own bookmark, so the client writes it. Added to
-- the column grant from 20260808000002 rather than replacing it: that grant is
-- the list of everything a client may write to its own row.
grant update (last_seen_activity_at) on public.users to authenticated;

-- ------------------------------------------------------------------
-- activity_feed: the partner's motion, newest first.
--
-- SECURITY INVOKER on purpose. Every table below is already couple-scoped by
-- policy (and entry_responses additionally mirrors the locked reveal), so
-- running as the caller means this function cannot show anything the caller
-- could not already read. There is no second authorization to keep in step.
--
-- Own-authored rows are filtered out: this is a record of what the OTHER person
-- did, not a diary of your own taps.
-- ------------------------------------------------------------------
create or replace function public.activity_feed(
  p_before timestamptz default null,
  p_limit int default 40
)
returns table (
  kind text,
  id uuid,
  actor_id uuid,
  happened_at timestamptz,
  preview text,
  target jsonb
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with me as (select (select auth.uid()) as uid),
  cutoff as (select coalesce(p_before, 'infinity'::timestamptz) as before),
  rows as (
    -- A heart, an amen, a kept line or a reply on a reflection. Reactions carry
    -- no body, and the client words those itself.
    select
      'response'::text as kind,
      r.id,
      r.author_id as actor_id,
      r.created_at as happened_at,
      r.body as preview,
      jsonb_build_object(
        'responseKind', r.kind,
        'couplePlanId', r.couple_plan_id,
        'day', r.day_number
      ) as target
    from public.entry_responses r, me
    where r.author_id <> me.uid

    union all

    select 'prayer', p.id, p.author_id, p.created_at, p.text,
           jsonb_build_object('prayerId', p.id)
    from public.prayers p, me
    where p.author_id <> me.uid

    union all

    select 'dream', d.id, d.author_id, d.created_at, d.text,
           jsonb_build_object('dreamId', d.id)
    from public.dreams d, me
    where d.author_id <> me.uid

    union all

    -- A verse note is ONE shared row either partner may edit, so an edit is
    -- real activity that no insert would show. greatest() is what surfaces it;
    -- created_at alone would hide a partner rewriting a note entirely.
    select 'note', n.id, n.user_id,
           greatest(n.created_at, coalesce(n.updated_at, n.created_at)),
           n.text,
           jsonb_build_object('book', n.book, 'chapter', n.chapter, 'verse', n.verse)
    from public.verse_notes n, me
    where n.user_id <> me.uid

    union all

    select 'verse_comment', c.id, c.user_id, c.created_at, c.body,
           jsonb_build_object(
             'commentKind', c.kind,
             'book', n.book, 'chapter', n.chapter, 'verse', n.verse
           )
    from public.verse_note_responses c
    join public.verse_notes n on n.id = c.note_id, me
    where c.user_id <> me.uid
  )
  select rows.kind, rows.id, rows.actor_id, rows.happened_at, rows.preview, rows.target
  from rows, cutoff
  where rows.happened_at < cutoff.before
  order by rows.happened_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

revoke execute on function public.activity_feed(timestamptz, int) from public, anon;
grant execute on function public.activity_feed(timestamptz, int) to authenticated;

-- ------------------------------------------------------------------
-- unread_activity_count: what the dot on Today is drawn from.
--
-- Capped, because the dot never shows a number: it only needs to know whether
-- anything is there, and a couple returning from a fortnight away should not
-- pay for a full count to learn that.
-- ------------------------------------------------------------------
create or replace function public.unread_activity_count()
returns int
language sql
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::int from (
    select 1 from public.activity_feed(null, 20) f
     where f.happened_at > coalesce(
       (select u.last_seen_activity_at from public.users u where u.id = (select auth.uid())),
       '-infinity'::timestamptz
     )
     limit 20
  ) s;
$$;

revoke execute on function public.unread_activity_count() from public, anon;
grant execute on function public.unread_activity_count() to authenticated;
