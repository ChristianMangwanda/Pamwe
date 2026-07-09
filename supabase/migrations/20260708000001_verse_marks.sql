-- Phase 1.1 — Verse highlights + notes (the shared study layer).
-- Model: per-couple visibility, shared editing; one highlight and one note per
-- verse per couple; user_id records authorship only. Keyed (book, chapter, verse)
-- using canonical BIBLE_BOOKS names, matching the prototype's book|chapter|verse key.

CREATE TABLE public.verse_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('amber', 'rose', 'sage', 'sky')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (couple_id, book, chapter, verse)
);

CREATE TABLE public.verse_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (couple_id, book, chapter, verse)
);

ALTER TABLE public.verse_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_notes ENABLE ROW LEVEL SECURITY;

-- Couple-scoped policies, same idiom as prayers (direct couples subquery — no
-- self-referencing recursion; see trial-and-error.md "RLS infinite recursion").

CREATE POLICY "verse_highlights_select" ON public.verse_highlights
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_highlights_insert" ON public.verse_highlights
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_highlights_update" ON public.verse_highlights
  FOR UPDATE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_highlights_delete" ON public.verse_highlights
  FOR DELETE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_notes_select" ON public.verse_notes
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_notes_insert" ON public.verse_notes
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_notes_update" ON public.verse_notes
  FOR UPDATE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "verse_notes_delete" ON public.verse_notes
  FOR DELETE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE INDEX idx_verse_highlights_couple ON public.verse_highlights (couple_id, book, chapter);
CREATE INDEX idx_verse_notes_couple ON public.verse_notes (couple_id, book, chapter);
