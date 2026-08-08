-- Replies to a revealed reflection could only ever be one deep. One partner
-- wrote, the other could say one thing back, and there the day ended: you could
-- not answer an answer. Christian's note, 2026-08-07: "my partner says something
-- and I reply, she can also reply to my reply and it keeps on going down".
--
-- parent_id turns those one-off responses into a chain. Everything else about
-- the layer is unchanged: hearts, amens and kept lines stay flat and stay on the
-- partner's entry, and the whole thread still only exists on a mutually revealed
-- day, because that gate lives in has_user_submitted_entry() and nothing here
-- touches it.
--
-- The one rule that HAD to move: you may now write on your own entry, because a
-- reply to her reply sits under words you wrote yourself. can_respond_to_entry()
-- refuses that by design (it is what stops you responding to your own
-- reflection), so a reply with a parent is authorised against the PARENT instead.

alter table public.entry_responses
  add column if not exists parent_id uuid references public.entry_responses(id) on delete cascade;

create index if not exists idx_entry_responses_parent on public.entry_responses(parent_id);

-- True when the caller may answer this response: it is in their couple, on a day
-- they have reached the reveal of, and the reply they are writing belongs to the
-- same entry the parent does. SECURITY DEFINER so reading entry_responses from
-- inside an entry_responses policy never re-enters that policy (the documented
-- recursion trap, trial-and-error.md).
create or replace function public.can_reply_to_response(p_parent_id uuid, p_entry_id uuid)
returns boolean language sql security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.entry_responses r
    join public.couple_plans cp on cp.id = r.couple_plan_id
    join public.couples c on c.id = cp.couple_id
    where r.id = p_parent_id
      and r.entry_id = p_entry_id
      and (c.partner_a_id = auth.uid() or c.partner_b_id = auth.uid())
      and public.has_user_submitted_entry(r.couple_plan_id, r.day_number, auth.uid())
  );
$$;

revoke execute on function public.can_reply_to_response(uuid, uuid) from public, anon;
grant execute on function public.can_reply_to_response(uuid, uuid) to authenticated;

-- A parent authorises a reply; no parent means the old rule, unchanged.
drop policy if exists "entry_responses_insert" on public.entry_responses;
create policy "entry_responses_insert" on public.entry_responses
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      case when parent_id is null
        then public.can_respond_to_entry(entry_id)
        else kind = 'reply' and public.can_reply_to_response(parent_id, entry_id)
      end
    )
  );
