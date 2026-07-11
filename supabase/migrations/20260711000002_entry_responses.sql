-- Responses to a partner's revealed reflection: a heart, an "amen", a short
-- written reply, or a saved line from what they wrote ("what stuck with me").
-- Closes the loop that used to dead-end at the reveal.
--
-- Visibility mirrors the entry itself: a response only exists after a day is
-- mutually revealed, and is readable by both partners then. You respond to your
-- PARTNER's entry, never your own. RLS leans on SECURITY DEFINER helpers so the
-- policy never re-triggers the entries policy (the documented recursion trap).

create table if not exists public.entry_responses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  couple_plan_id uuid not null references public.couple_plans(id) on delete cascade,
  day_number int4 not null,
  author_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('heart', 'amen', 'reply', 'quote')),
  body text,
  created_at timestamptz not null default now()
);

create index if not exists idx_entry_responses_entry on public.entry_responses(entry_id);
-- Reactions (heart/amen) are one-per-author-per-entry so a tap toggles; replies
-- and quotes can repeat.
create unique index if not exists uq_entry_responses_reaction
  on public.entry_responses(entry_id, author_id, kind)
  where kind in ('heart', 'amen');

alter table public.entry_responses enable row level security;

-- True when the caller may respond to this entry: it is their partner's (not
-- their own), in their couple, and the day is mutually submitted (revealed).
create or replace function public.can_respond_to_entry(p_entry_id uuid)
returns boolean language sql security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.entries e
    join public.couple_plans cp on cp.id = e.couple_plan_id
    join public.couples c on c.id = cp.couple_id
    where e.id = p_entry_id
      and e.user_id <> auth.uid()
      and (c.partner_a_id = auth.uid() or c.partner_b_id = auth.uid())
      and public.has_user_submitted_entry(e.couple_plan_id, e.day_number, auth.uid())
      and exists (
        select 1 from public.entries them
        where them.couple_plan_id = e.couple_plan_id
          and them.day_number = e.day_number
          and them.user_id = e.user_id
          and them.submitted_at is not null
      )
  );
$$;

revoke execute on function public.can_respond_to_entry(uuid) from anon;
grant execute on function public.can_respond_to_entry(uuid) to authenticated;

-- Read: any response on a revealed day in my couple (mine to them, theirs to
-- me). has_user_submitted_entry gates on the caller having reached the reveal.
create policy "entry_responses_select" on public.entry_responses
  for select to authenticated using (
    couple_plan_id in (
      select cp.id from public.couple_plans cp
      join public.couples c on cp.couple_id = c.id
      where c.partner_a_id = auth.uid() or c.partner_b_id = auth.uid()
    )
    and public.has_user_submitted_entry(couple_plan_id, day_number, auth.uid())
  );

create policy "entry_responses_insert" on public.entry_responses
  for insert to authenticated with check (
    author_id = auth.uid() and public.can_respond_to_entry(entry_id)
  );

create policy "entry_responses_update" on public.entry_responses
  for update to authenticated using (author_id = auth.uid());

create policy "entry_responses_delete" on public.entry_responses
  for delete to authenticated using (author_id = auth.uid());

grant select, insert, update, delete on public.entry_responses to authenticated;
