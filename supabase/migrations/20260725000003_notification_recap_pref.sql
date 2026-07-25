-- Weekly recap reminder.
--
-- The recaps screen has always rendered a mock lock-screen banner reading
-- "Your week together is ready" over the caption "Sent to you both", but
-- nothing ever sent it: there is no notify-recap function, no cron, and no
-- weekly trigger anywhere. progress.md recorded it at the time as
-- "delivery still APNs-blocked, mock only". APNs has been live since
-- 2026-07-11, so the reminder is now scheduled on-device, and this pref makes
-- it controllable like every other push in the app.
alter table public.users
  add column if not exists notification_recap boolean not null default true;
