-- The Bible catalogue: every verse, passage and chapter of the WEB, tagged by
-- SUBJECT MATTER so retrieval can find "the passages about grief" with a query
-- instead of a model improvising a reading list from a couple's phrasing.
--
-- Generated once by scripts/gen_bible_catalogue.py against the spec in
-- scripts/bible_catalogue_spec.py (the tag vocabulary, the governing
-- points-never-preaches rule, and the version history live there). Passage
-- boundaries are NOT model output: they are fixed in code from the BSB's
-- printed sections, so the same chapter divides identically forever. Tags name
-- what a text is about, never what it teaches.
--
-- Seeded from supabase/seeds/bible_catalogue.sql. Reference data: readable by
-- any signed-in user, written only by the service role (no write policies).
--
-- Book naming: rows use bible.ts / helloao common names, so the 150-psalm book
-- is 'Psalms'. plan_days stores 'Psalm 23' (see gen_passage_prompts.py's
-- normalize_book); any layer joining the two must normalize.

create table public.bible_books (
  book text primary key,                -- 'Genesis' ... 'Revelation'
  code text not null unique,            -- USFM: 'GEN' ... 'REV'
  ord int4 not null unique,             -- canonical order 1..66
  chapters int4 not null
);

create table public.bible_chapters (
  book text not null references public.bible_books(book),
  chapter int4 not null,
  n_verses int4 not null,
  summary text not null,
  themes text[] not null,
  genre text not null,
  tone text not null,
  catalogue_version text not null,      -- SPEC_VERSION that produced the row
  primary key (book, chapter)
);

create table public.bible_verses (
  book text not null,
  chapter int4 not null,
  verse int4 not null,
  text text not null,                   -- WEB, public domain
  themes text[] not null default '{}',  -- empty = the verse is about nothing
                                        -- taggable (a name in a list), on purpose
  tone text not null,
  caution text[] not null default '{}',
  primary key (book, chapter, verse),
  foreign key (book, chapter) references public.bible_chapters(book, chapter)
);

create table public.bible_passages (
  book text not null,
  chapter int4 not null,
  verse_start int4 not null,
  verse_end int4 not null,
  summary text not null,
  themes text[] not null default '{}',
  tone text not null,
  caution text[] not null default '{}',
  primary key (book, chapter, verse_start),
  foreign key (book, chapter) references public.bible_chapters(book, chapter),
  check (verse_start >= 1 and verse_end >= verse_start)
);

-- The closed vocabulary the tags are drawn from, with the glosses they were
-- tagged under. Lets retrieval validate a requested theme and lets any future
-- UI show what a tag means. (kind, term) because 'narrative' is both a tone
-- and a genre.
create table public.bible_vocabulary (
  kind text not null check (kind in ('theme', 'tone', 'genre', 'caution')),
  term text not null,
  gloss text not null default '',
  primary key (kind, term)
);

-- Retrieval is array-membership all day: themes @> '{grief}' and caution = '{}'.
create index bible_verses_themes_idx on public.bible_verses using gin (themes);
create index bible_passages_themes_idx on public.bible_passages using gin (themes);
create index bible_passages_caution_idx on public.bible_passages using gin (caution);

-- Explicit grants: this migration is applied with psql as postgres locally,
-- which does not pick up the default privileges a `supabase migration up`
-- would. Without these the service role gets "permission denied" before RLS
-- is even consulted.
grant select on public.bible_books, public.bible_chapters, public.bible_verses,
  public.bible_passages, public.bible_vocabulary to anon, authenticated;
grant all on public.bible_books, public.bible_chapters, public.bible_verses,
  public.bible_passages, public.bible_vocabulary to service_role;

alter table public.bible_books enable row level security;
alter table public.bible_chapters enable row level security;
alter table public.bible_verses enable row level security;
alter table public.bible_passages enable row level security;
alter table public.bible_vocabulary enable row level security;

create policy bible_books_select on public.bible_books
  for select to authenticated using (true);
create policy bible_chapters_select on public.bible_chapters
  for select to authenticated using (true);
create policy bible_verses_select on public.bible_verses
  for select to authenticated using (true);
create policy bible_passages_select on public.bible_passages
  for select to authenticated using (true);
create policy bible_vocabulary_select on public.bible_vocabulary
  for select to authenticated using (true);
