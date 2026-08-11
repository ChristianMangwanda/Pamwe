-- Two things the notification settings could not say.
--
-- 1. "Not in the morning, thank you." Every other category has a switch;
--    the morning reminder had five preset times and no way off. Someone who
--    did not want it had to turn off notifications for the whole app, which
--    also takes away the partner's reflection landing, the point of the thing.
--
-- 2. "Do not put that on my lock screen." Pamwe's notifications carry the most
--    private material the app holds: a partner's reflection arriving, the text
--    of a new prayer, a dream. All of it renders on a locked phone, in front of
--    whoever happens to be looking at it on a kitchen table. iOS can hide
--    previews globally, but that is a decision about every app at once, and
--    this is the one where it matters most.
--
-- notification_preview: 'full' shows what happened, 'generic' shows only that
-- something did ("Pamwe", "Something is waiting for you"). Deliberately not a
-- per-category setting: a control you have to reason about six times is one
-- nobody sets, and the answer is nearly always the same for all of them.

alter table public.users
  add column if not exists notification_morning boolean not null default true,
  add column if not exists notification_preview text not null default 'full'
    check (notification_preview in ('full', 'generic'));

-- Added to the column grant from 20260808000002, which is the list of
-- everything a client may write to its own row. A new client-written column
-- that is not here is silently refused.
grant update (notification_morning, notification_preview) on public.users to authenticated;
