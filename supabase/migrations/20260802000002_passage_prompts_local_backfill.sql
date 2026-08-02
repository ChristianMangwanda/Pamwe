-- Backfill: passage_prompts existed on hosted (applied there by name via MCP)
-- but no migration file ever landed in the repo, so a fresh local stack has the
-- seed in supabase/seeds/passage_prompts.sql and no table to put it in. This
-- mirrors the hosted definition exactly (checked 2026-08-02); IF NOT EXISTS
-- makes it a no-op wherever the table already lives.
--
-- Chapter-keyed reflection prompts: one question per chapter, generated once by
-- scripts/gen_passage_prompts.py. Any plan that includes a chapter gets that
-- chapter's question. The psalter is keyed 'Psalm' (matching plan_days), not
-- 'Psalms' (the catalogue tables); joins between the two must normalise.

create table if not exists public.passage_prompts (
  id uuid primary key default gen_random_uuid(),
  book text not null,
  chapter integer not null,
  prompt text not null,
  created_at timestamptz not null default now(),
  unique (book, chapter)
);

grant select on public.passage_prompts to anon, authenticated;
grant all on public.passage_prompts to service_role;

alter table public.passage_prompts enable row level security;

drop policy if exists passage_prompts_select on public.passage_prompts;
create policy passage_prompts_select on public.passage_prompts
  for select to authenticated using (true);
