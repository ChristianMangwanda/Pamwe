-- Cooldown log for partner nudges ("thinking of you, ready to read?"). Only the
-- notify-nudge edge function (service role) reads and writes this; RLS is on with
-- no policies so clients can neither read nor write it directly.
create table if not exists public.partner_nudges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_nudges_from on public.partner_nudges(from_user, created_at desc);

alter table public.partner_nudges enable row level security;
