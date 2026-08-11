-- You could search your own notes, but not the Bible.
--
-- searchSharedLayer covers verse_notes, verse_highlights and revealed
-- reflections, and the Bible tab's own box filters BOOK NAMES. So "where is
-- the bit about a cord of three strands" found nothing unless somebody had
-- already written a note about it, which is the opposite of how a person looks
-- for a half-remembered verse.
--
-- Full text rather than ILIKE. 31,103 rows is small enough that a sequential
-- scan per keystroke would technically work, but ILIKE cannot stem ("praying"
-- would miss "pray"), cannot rank, and on the free tier a scan per keystroke
-- across every user is exactly the load worth not adding. A stored tsvector
-- with a GIN index turns it into an index lookup.

alter table public.bible_verses
  add column if not exists search tsvector
  generated always as (to_tsvector('english', text)) stored;

create index if not exists bible_verses_search_idx
  on public.bible_verses using gin (search);

-- ------------------------------------------------------------------
-- search_verses: what the Bible tab's Scripture results are drawn from.
--
-- A function rather than supabase-js .textSearch() because the ORDER BY is the
-- point: ts_rank puts the verse a person is actually reaching for at the top,
-- and PostgREST cannot order by a computed rank.
--
-- SECURITY INVOKER: bible_verses is reference data, already SELECT-able by
-- every signed-in user, so there is nothing here to elevate.
-- ------------------------------------------------------------------
create or replace function public.search_verses(p_query text, p_limit int default 30)
returns table (
  book text,
  chapter int,
  verse int,
  text text,
  rank real
)
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  with q as (
    -- websearch_to_tsquery, so "cord of three strands" behaves the way people
    -- expect from a search box, and a stray quote cannot raise a syntax error
    -- the way to_tsquery would.
    select websearch_to_tsquery('english', coalesce(btrim(p_query), '')) as tsq
  )
  select v.book, v.chapter, v.verse, v.text, ts_rank(v.search, q.tsq) as rank
  from public.bible_verses v, q
  where q.tsq is not null
    and q.tsq::text <> ''
    and v.search @@ q.tsq
  -- Canonical order breaks a rank tie, so equally-ranked verses come back in
  -- Bible order rather than whatever the scan happened to produce.
  order by rank desc, v.book, v.chapter, v.verse
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

revoke execute on function public.search_verses(text, int) from public, anon;
grant execute on function public.search_verses(text, int) to authenticated;
