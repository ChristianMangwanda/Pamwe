-- Retrieval over the Bible catalogue: themes in, readable passages out.
--
-- This is the layer that replaces "a model improvises a reading list". It is
-- deliberately plain SQL so the same request always returns the same pool, and
-- so nothing in the retrieval path can invent a reference. The plan agent that
-- runs above this only ever picks FROM what this returns.
--
-- Caution semantics: a passage carrying caution flags is returned only when
-- EVERY flag it carries is in allow_cautions. The default of '{}' therefore
-- returns only unflagged passages. The caller opts INTO flagged territory when
-- the request is squarely about it: a couple asking for help while they cannot
-- conceive should get Hannah (1 Samuel 1, flagged infertility), and a couple
-- asking about grief in general should not stumble into a dead child.
--
-- Diversity: at most 4 passages per book, so a psalm-heavy theme cannot fill
-- the whole pool from one book. Ordering is relevance then canonical position,
-- fully deterministic.

create or replace function public.retrieve_passages(
  want_themes text[],
  allow_cautions text[] default '{}',
  max_rows int default 40
)
returns table (
  book text,
  chapter int4,
  verse_start int4,
  verse_end int4,
  chapter_verses int4,
  summary text,
  themes text[],
  tone text,
  caution text[],
  genre text,
  score int4
)
language sql
stable
set search_path = public
as $$
  select book, chapter, verse_start, verse_end, chapter_verses,
         summary, themes, tone, caution, genre, score
  from (
    select p.book, p.chapter, p.verse_start, p.verse_end,
           c.n_verses as chapter_verses,
           p.summary, p.themes, p.tone, p.caution,
           c.genre,
           (select count(*) from unnest(p.themes) t where t = any(want_themes))::int4 as score,
           b.ord,
           row_number() over (
             partition by p.book
             order by (select count(*) from unnest(p.themes) t where t = any(want_themes)) desc,
                      p.chapter, p.verse_start
           ) as book_rank
    from public.bible_passages p
    join public.bible_chapters c using (book, chapter)
    join public.bible_books b using (book)
    where p.themes && want_themes
      and p.caution <@ allow_cautions
  ) ranked
  where book_rank <= 4
  order by score desc, ord, chapter, verse_start
  limit max_rows
$$;
