-- Dreams: a shared journal of the dreams a couple wants to keep, talk about,
-- and pray over.
--
-- Product call (Christian, 2026-07-25): Pamwe does NOT interpret dreams. The
-- app's standing rule is that Pamwe points and never preaches (see the
-- ask-pamwe system prompt), and dream interpretation is contested ground that
-- people act on. So this is a plain written record plus a route into the
-- prayer list, with no AI anywhere near it.
--
-- Couple-scoped exactly like prayers: both partners read every dream, only the
-- author edits or deletes their own. Written in the POST-hardening shape from
-- the start, so it never needs the two follow-up fixes prayers needed:
--   * 20260709000003 - the INSERT check pins BOTH authorship and couple
--     membership. Checking authorship alone let any authenticated user inject
--     a row into a stranger's couple feed.
--   * 20260708000005 - an explicit DELETE policy ships with the table. prayers
--     shipped with none, so deletes silently did nothing.
-- Both UPDATE clauses are author-pinned: per 20260709000002, an UPDATE policy
-- with USING but no WITH CHECK re-applies USING to the NEW row, so spelling it
-- out keeps a dream from being handed to someone else mid-update.
--
-- Table grants come from 20260708000004's ALTER DEFAULT PRIVILEGES, so this
-- table inherits anon/authenticated DML without a per-table grant.

create table if not exists public.dreams (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  text text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);

-- The list reads one couple's dreams newest first; the index matches that.
create index if not exists idx_dreams_couple on public.dreams (couple_id, created_at desc);

alter table public.dreams enable row level security;

create policy dreams_select on public.dreams
  for select to authenticated
  using (
    couple_id in (
      select c.id from public.couples c
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

create policy dreams_insert on public.dreams
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and couple_id in (
      select c.id from public.couples c
      where c.partner_a_id = (select auth.uid())
         or c.partner_b_id = (select auth.uid())
    )
  );

-- Author-only edit and delete: your partner reads your dream, never rewrites it.
create policy dreams_update on public.dreams
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy dreams_delete on public.dreams
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- The list screen subscribes to dreams the same way it does prayers.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dreams'
  ) then
    alter publication supabase_realtime add table public.dreams;
  end if;
end $$;
