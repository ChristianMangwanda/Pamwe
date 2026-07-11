-- Ask Pamwe rate limiting. Only the edge function (service role) touches this
-- table; RLS is enabled with no policies so clients can neither read nor write.
create table if not exists public.ask_pamwe_usage (
  user_id uuid not null,
  day date not null,
  count int4 not null default 0,
  last_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ask_pamwe_usage enable row level security;

-- Atomically bump today's counter for a user and report the state BEFORE the
-- bump, so the edge function can apply its daily cap and a short cooldown.
create or replace function public.bump_ask_pamwe_usage(p_user uuid)
returns table (new_count int4, prev_last_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev timestamptz;
  v_count int4;
begin
  select au.last_at, au.count into v_prev, v_count
  from ask_pamwe_usage au
  where au.user_id = p_user and au.day = current_date
  for update;

  if not found then
    insert into ask_pamwe_usage (user_id, day, count) values (p_user, current_date, 1);
    return query select 1::int4, null::timestamptz;
  else
    update ask_pamwe_usage
    set count = v_count + 1, last_at = now()
    where user_id = p_user and day = current_date;
    return query select (v_count + 1)::int4, v_prev;
  end if;
end;
$$;

revoke execute on function public.bump_ask_pamwe_usage(uuid) from public, anon, authenticated;
