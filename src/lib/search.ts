import { supabase } from './supabase';
import { getRevealedReflections } from './reflections';

// Search across the couple's shared layer: notes, highlights, and revealed
// reflections. RLS already scopes every table to the couple. Notes and
// reflections match on text; highlights (which carry no text) match on their
// reference, so a search for a book or chapter surfaces them too.

export type SearchResults = {
  notes: { id: string; book: string; chapter: number; verse: number; text: string }[];
  reflections: { id: string; couplePlanId: string; dayNumber: number; reference: string; snippet: string }[];
  highlights: { id: string; book: string; chapter: number; verse: number; color: string }[];
};

const EMPTY: SearchResults = { notes: [], reflections: [], highlights: [] };

export async function searchSharedLayer(coupleId: string, rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return EMPTY;
  const like = `%${q}%`;
  const lower = q.toLowerCase();

  const [notesRes, hlRes, reflections] = await Promise.all([
    supabase.from('verse_notes')
      .select('id, book, chapter, verse, text')
      .eq('couple_id', coupleId)
      .ilike('text', like)
      .limit(50),
    supabase.from('verse_highlights')
      .select('id, book, chapter, verse, color')
      .eq('couple_id', coupleId)
      .ilike('book', like)
      .limit(50),
    getRevealedReflections(coupleId).catch(() => []),
  ]);

  const matchedReflections = reflections
    .filter((r) => r.snippet.toLowerCase().includes(lower) || r.reference.toLowerCase().includes(lower))
    .slice(0, 50)
    .map((r) => ({
      id: r.id, couplePlanId: r.couplePlanId, dayNumber: r.dayNumber, reference: r.reference, snippet: r.snippet,
    }));

  return {
    notes: (notesRes.data ?? []) as SearchResults['notes'],
    highlights: (hlRes.data ?? []) as SearchResults['highlights'],
    reflections: matchedReflections,
  };
}

export type VerseHit = { book: string; chapter: number; verse: number; text: string };

/** Search the Bible itself.
 *
 *  Separate from searchSharedLayer on purpose: that one is about what the two
 *  of you have written, this one is about what Scripture says, and the two want
 *  different words on the screen and different empty states.
 *
 *  Every word has to appear (the query is ANDed), which is what keeps the top
 *  result the verse someone is reaching for. It also means a half-remembered
 *  phrase from another translation can find nothing at all: the WEB says
 *  "a threefold cord", so "cord of three strands" is genuinely absent. Fewer
 *  words is the fix, and the screen says so rather than pretending. */
export async function searchScripture(rawQuery: string, limit = 30): Promise<VerseHit[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_verses', { p_query: q, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    book: r.book, chapter: r.chapter, verse: r.verse, text: r.text,
  }));
}
