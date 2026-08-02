import { supabase } from './supabase';
import { BIBLE_BOOKS } from './bible';
import type { SwatchColor } from '../theme/tokens';

// The shared per-couple study layer. Highlights and notes are keyed by
// (book, chapter, verse) with canonical BIBLE_BOOKS names, one of each per verse
// per couple; RLS scopes everything to the couple (see verse_marks migration).
//
// `user_id` is who marked it. The column was always written but never read, so
// the reader could not tell your highlight from your partner's and labelled
// every note "Your note". The reader now carries their initial on what they
// marked. Authorship is last-writer-wins by way of the upsert, which is the
// existing behaviour: a shared layer either partner may edit.

export interface VerseHighlight {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse: number;
  color: SwatchColor;
}

export interface VerseNote {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const HL_COLS = 'id, user_id, book, chapter, verse, color';
const NOTE_COLS = 'id, user_id, book, chapter, verse, text';

export async function getMarksForChapter(coupleId: string, book: string, chapter: number) {
  const [hl, nt] = await Promise.all([
    supabase.from('verse_highlights').select(HL_COLS).eq('couple_id', coupleId).eq('book', book).eq('chapter', chapter),
    supabase.from('verse_notes').select(NOTE_COLS).eq('couple_id', coupleId).eq('book', book).eq('chapter', chapter),
  ]);
  return {
    highlights: (hl.data ?? []) as VerseHighlight[],
    notes: (nt.data ?? []) as VerseNote[],
  };
}

export async function getAllMarks(coupleId: string) {
  const [hl, nt] = await Promise.all([
    supabase.from('verse_highlights').select(HL_COLS).eq('couple_id', coupleId),
    supabase.from('verse_notes').select(NOTE_COLS).eq('couple_id', coupleId),
  ]);
  const bookIdx = (name: string) => BIBLE_BOOKS.findIndex((b) => b.name === name);
  const byCanon = (a: { book: string; chapter: number; verse: number }, b: typeof a) =>
    bookIdx(a.book) - bookIdx(b.book) || a.chapter - b.chapter || a.verse - b.verse;
  return {
    highlights: ((hl.data ?? []) as VerseHighlight[]).sort(byCanon),
    notes: ((nt.data ?? []) as VerseNote[]).sort(byCanon),
  };
}

export async function setHighlight(coupleId: string, book: string, chapter: number, verse: number, color: SwatchColor) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('verse_highlights')
    .upsert(
      { couple_id: coupleId, user_id: user.id, book, chapter, verse, color, updated_at: new Date().toISOString() },
      { onConflict: 'couple_id,book,chapter,verse' },
    );
  if (error) throw error;
}

export async function clearHighlight(coupleId: string, book: string, chapter: number, verse: number) {
  const { error } = await supabase
    .from('verse_highlights')
    .delete()
    .eq('couple_id', coupleId).eq('book', book).eq('chapter', chapter).eq('verse', verse);
  if (error) throw error;
}

export async function saveNote(coupleId: string, book: string, chapter: number, verse: number, text: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('verse_notes')
    .upsert(
      { couple_id: coupleId, user_id: user.id, book, chapter, verse, text, updated_at: new Date().toISOString() },
      { onConflict: 'couple_id,book,chapter,verse' },
    );
  if (error) throw error;
}

export async function deleteNote(coupleId: string, book: string, chapter: number, verse: number) {
  const { error } = await supabase
    .from('verse_notes')
    .delete()
    .eq('couple_id', coupleId).eq('book', book).eq('chapter', chapter).eq('verse', verse);
  if (error) throw error;
}
