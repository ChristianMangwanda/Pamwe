-- Pausing, as a decision the two of you make together.
--
-- From the onboarding/offboarding handoff (August 2026): "Ask Ammy to pause",
-- "Nothing changes until she agrees", and a request that can be withdrawn.
-- Christian's call (2026-08-10) was to build it exactly that way rather than
-- letting one partner stop the other's ritual, because the whole app already
-- works like that: a reflection does not unlock until both have written.
--
-- One table serves every both-of-you decision, not just pausing. Leaving needs
-- the same shape (Part 3 of build27-plan.md), and the backlog has wanted it for
-- plan and cadence changes since the audit round.

-- ------------------------------------------------------------------
-- Current state lives on the couple; the HISTORY lives in couple_pauses.
--
-- Both are needed, and for different reasons. `paused_at` is what every screen
-- and every reminder asks. The intervals are what the streak needs, because a
-- streak here is derived rather than stored: compute_streak replays sealed days
-- on every seal, so "your streak stays where it is" cannot be a saved number.
-- It has to be a stretch of calendar the replay knows to skip.
-- ------------------------------------------------------------------
alter table public.couples
  add column if not exists paused_at timestamptz,
  add column if not exists paused_by uuid references public.users(id) on delete set null;

create table if not exists public.couple_pauses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  started_by uuid references public.users(id) on delete set null,
  ended_by uuid references public.users(id) on delete set null
);

create index if not exists couple_pauses_couple_idx on public.couple_pauses (couple_id, started_at);
-- A couple is either paused or not. Two open intervals would double-count every
-- day in the overlap and quietly inflate the streak.
create unique index if not exists couple_pauses_one_open
  on public.couple_pauses (couple_id) where ended_at is null;

-- ------------------------------------------------------------------
-- The requests themselves.
-- ------------------------------------------------------------------
create table if not exists public.couple_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  kind text not null check (kind in ('pause', 'restart')),
  requested_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.users(id) on delete set null
);

create index if not exists couple_requests_couple_idx on public.couple_requests (couple_id, created_at desc);
-- One open ask at a time, per kind. Without this, tapping twice on a slow
-- connection leaves two pending rows and answering one still shows the other.
create unique index if not exists couple_requests_one_pending
  on public.couple_requests (couple_id, kind) where status = 'pending';

alter table public.couple_pauses enable row level security;
alter table public.couple_requests enable row level security;

-- Readable by the couple, writable by nobody. Every state change goes through
-- the functions below, which is the same shape pairing took in 20260808000001
-- and for the same reason: the interesting rules are about WHO may answer, and
-- a policy cannot express "not the person who asked" as cleanly as this can.
create policy couple_requests_select_own on public.couple_requests
  for select to authenticated
  using (couple_id = public.current_user_couple_id());

create policy couple_pauses_select_own on public.couple_pauses
  for select to authenticated
  using (couple_id = public.current_user_couple_id());

revoke insert, update, delete on public.couple_requests from anon, authenticated;
revoke insert, update, delete on public.couple_pauses from anon, authenticated;

-- The partner's phone should show the ask without being told to look.
alter publication supabase_realtime add table public.couple_requests;

-- Rescore one couple. update_streak_on_mutual_submit has always done this
-- inline; coming back from a pause needs the same two lines at a moment when
-- nobody has submitted anything, so they get a name.
create or replace function public.refresh_streak(p_couple uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.couples c
     set (streak_count, streak_last_date) =
         (select s.streak, s.last_date from public.compute_streak(c.id) s)
   where c.id = p_couple;
end;
$$;

revoke execute on function public.refresh_streak(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------
-- ask: open a pending request of either kind.
-- ------------------------------------------------------------------
create or replace function public.request_couple_change(p_kind text)
returns public.couple_requests
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple public.couples;
  v_row public.couple_requests;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_kind not in ('pause', 'restart') then raise exception 'Unknown request'; end if;

  select * into v_couple from public.couples c
   where c.id = (select u.couple_id from public.users u where u.id = v_uid)
   for update;

  if v_couple.id is null then raise exception 'You are not in a couple'; end if;
  -- Asking to pause needs somebody to pause it with.
  if v_couple.paired_at is null then raise exception 'You are not paired yet'; end if;

  if p_kind = 'pause' and v_couple.paused_at is not null then
    raise exception 'Already paused';
  end if;
  if p_kind = 'restart' and v_couple.paused_at is null then
    raise exception 'Not paused';
  end if;

  -- A second ask of the same kind replaces nothing: the unique index says there
  -- can only be one, and the honest answer to a double tap is the row already
  -- sitting there rather than an error the screen has to explain.
  select * into v_row from public.couple_requests r
   where r.couple_id = v_couple.id and r.kind = p_kind and r.status = 'pending';
  if v_row.id is not null then return v_row; end if;

  insert into public.couple_requests (couple_id, kind, requested_by)
  values (v_couple.id, p_kind, v_uid)
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------------
-- answer: only the OTHER partner, and only once.
-- ------------------------------------------------------------------
create or replace function public.respond_to_couple_request(p_id uuid, p_accept boolean)
returns public.couple_requests
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.couple_requests;
  v_couple public.couples;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.couple_requests r where r.id = p_id for update;
  if v_row.id is null then raise exception 'That request is gone'; end if;
  if v_row.status <> 'pending' then raise exception 'That request has already been answered'; end if;

  select * into v_couple from public.couples c where c.id = v_row.couple_id for update;
  if v_uid not in (v_couple.partner_a_id, v_couple.partner_b_id) then
    raise exception 'That request is not yours to answer';
  end if;
  -- The point of the whole mechanism. Answering your own ask would make it a
  -- two-tap version of doing it unilaterally.
  if v_uid = v_row.requested_by then
    raise exception 'Your partner has to answer this one';
  end if;

  update public.couple_requests
     set status = case when p_accept then 'accepted' else 'declined' end,
         responded_at = now(),
         responded_by = v_uid
   where id = p_id
   returning * into v_row;

  if p_accept and v_row.kind = 'pause' then
    update public.couples set paused_at = now(), paused_by = v_row.requested_by where id = v_couple.id;
    insert into public.couple_pauses (couple_id, started_by) values (v_couple.id, v_row.requested_by);
  elsif p_accept and v_row.kind = 'restart' then
    update public.couples set paused_at = null, paused_by = null where id = v_couple.id;
    update public.couple_pauses set ended_at = now(), ended_by = v_uid
     where couple_id = v_couple.id and ended_at is null;
    -- The streak is replayed from scratch on the next seal anyway, but doing it
    -- here means the number on screen is right the moment they come back rather
    -- than after the next reading.
    perform public.refresh_streak(v_couple.id);
  end if;

  return v_row;
end;
$$;

-- ------------------------------------------------------------------
-- withdraw: only the person who asked, and only while it is unanswered.
-- ------------------------------------------------------------------
create or replace function public.withdraw_couple_request(p_id uuid)
returns public.couple_requests
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.couple_requests;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.couple_requests r where r.id = p_id for update;
  if v_row.id is null then raise exception 'That request is gone'; end if;
  if v_row.requested_by <> v_uid then raise exception 'That request is not yours'; end if;
  if v_row.status <> 'pending' then raise exception 'That request has already been answered'; end if;

  update public.couple_requests
     set status = 'withdrawn', responded_at = now(), responded_by = v_uid
   where id = p_id
   returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.request_couple_change(text) from public, anon;
revoke execute on function public.respond_to_couple_request(uuid, boolean) from public, anon;
revoke execute on function public.withdraw_couple_request(uuid) from public, anon;
grant execute on function public.request_couple_change(text) to authenticated;
grant execute on function public.respond_to_couple_request(uuid, boolean) to authenticated;
grant execute on function public.withdraw_couple_request(uuid) to authenticated;

-- ------------------------------------------------------------------
-- The streak learns to skip a pause.
--
-- 20260808000003's version, with one change: the gap between two sealed days
-- has the paused days inside it subtracted before it is measured against the
-- forgiveness window. A couple who pause for a month and come back land on the
-- day after the one they left on, as far as the streak is concerned.
--
-- Deliberately NOT a stored number that pausing freezes. The streak was made
-- derived in 20260726000002 because a stored counter that missed a trigger
-- stayed wrong forever with no way back, and that reasoning does not stop
-- applying just because there is a new way to miss a day.
-- ------------------------------------------------------------------
create or replace function public.paused_days_between(p_couple uuid, p_from date, p_to date, p_tz text)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(
    greatest(
      0,
      least(p_to, coalesce((cp.ended_at at time zone p_tz)::date, p_to))
        - greatest(p_from, (cp.started_at at time zone p_tz)::date)
    )
  ), 0)::int
  from public.couple_pauses cp
  where cp.couple_id = p_couple;
$$;

revoke execute on function public.paused_days_between(uuid, date, date, text) from public, anon, authenticated;

create or replace function public.compute_streak(p_couple uuid)
returns table (streak int, last_date date)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tz text;
  v_window int;
  r record;
  v_prev date := null;
  v_count int := 0;
  v_gap int;
begin
  select coalesce(c.timezone, 'UTC') into v_tz from public.couples c where c.id = p_couple;
  -- Widest rhythm the couple reads on, plus four forgiven days.
  select coalesce(max(cp.cadence_days), 1) + 4 into v_window
    from public.couple_plans cp where cp.couple_id = p_couple;

  -- One row per SEALED plan day (both partners submitted), dated by the first
  -- submit of the pair so a session straddling midnight counts for the day it began.
  -- "Both partners" means THESE two partners: any other user's row is not a seal.
  for r in
    select min(e.submitted_at at time zone v_tz)::date as d
    from public.entries e
    join public.couple_plans cp on cp.id = e.couple_plan_id
    join public.couples c on c.id = cp.couple_id
    where cp.couple_id = p_couple
      and e.submitted_at is not null
      and e.user_id in (c.partner_a_id, c.partner_b_id)
    group by e.couple_plan_id, e.day_number
    having count(distinct e.user_id) = 2
    order by 1
  loop
    if v_prev is null then
      v_count := 1;
    else
      v_gap := (r.d - v_prev) - public.paused_days_between(p_couple, v_prev, r.d, v_tz);
      if v_gap <= v_window then
        v_count := v_count + 1;
      else
        v_count := 1;
      end if;
    end if;
    v_prev := r.d;
  end loop;

  return query select v_count, v_prev;
end;
$$;

revoke execute on function public.compute_streak(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------
-- Tell the other phone.
-- ------------------------------------------------------------------
create or replace function public.notify_on_couple_request()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_url text; v_key text; v_secret text; v_headers jsonb;
begin
  select nc.url, nc.key, nc.secret into v_url, v_key, v_secret from public.notify_config() nc;
  if v_url is not null and v_key is not null then
    v_headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key);
    if v_secret is not null then
      v_headers := v_headers || jsonb_build_object('x-webhook-secret', v_secret);
    end if;
    perform net.http_post(
      url := v_url || '/functions/v1/notify-couple-request',
      headers := v_headers,
      body := jsonb_build_object('record', row_to_json(new))
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_on_couple_request() from public, anon, authenticated;

drop trigger if exists notify_couple_request_asked on public.couple_requests;
create trigger notify_couple_request_asked
  after insert on public.couple_requests
  for each row execute function public.notify_on_couple_request();

-- Answered, withdrawn and declined all matter to the person waiting, and a
-- withdrawal matters to the person who was asked. One function, one endpoint;
-- which sentence to send is the function's business, not the trigger's.
drop trigger if exists notify_couple_request_answered on public.couple_requests;
create trigger notify_couple_request_answered
  after update of status on public.couple_requests
  for each row when (old.status = 'pending' and new.status <> 'pending')
  execute function public.notify_on_couple_request();

-- Rescore every couple under the pause-aware count. A no-op today, since
-- nobody has paused yet, but it keeps the property every streak migration has
-- had since 20260726000002: re-running the function is the whole backfill.
update public.couples c
set (streak_count, streak_last_date) =
    (select s.streak, s.last_date from public.compute_streak(c.id) s);
