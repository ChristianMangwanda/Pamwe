import { supabase } from './supabase';

// What a couple says back to a note on a verse. The note itself stays one shared
// note either of you may edit (verseMarks.ts); this is the discussion under it,
// which is one person speaking at a time and so is author-owned.
//
// Flat, not threaded: a verse note is a thing you are both looking at, and a
// page of remarks under it reads better than a tree. The reflection chain in
// entryResponses.ts nests, because that is a conversation between two people.

export type VerseResponseKind = 'heart' | 'amen' | 'comment';

export type VerseNoteResponse = {
  id: string;
  note_id: string;
  user_id: string;
  kind: VerseResponseKind;
  body: string | null;
  created_at: string;
};

const COLS = 'id, note_id, user_id, kind, body, created_at';

export async function getNoteResponses(noteId: string): Promise<VerseNoteResponse[]> {
  const { data, error } = await supabase
    .from('verse_note_responses')
    .select(COLS)
    .eq('note_id', noteId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VerseNoteResponse[];
}

async function myId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// Tap once to add, again to remove; the partial unique index keeps it one per
// person per kind. Returns the new on/off state.
export async function toggleNoteReaction(
  noteId: string, coupleId: string, kind: 'heart' | 'amen',
): Promise<boolean> {
  const uid = await myId();
  const { data: existing } = await supabase
    .from('verse_note_responses')
    .select('id')
    .eq('note_id', noteId)
    .eq('user_id', uid)
    .eq('kind', kind)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('verse_note_responses').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from('verse_note_responses')
    .insert({ note_id: noteId, couple_id: coupleId, user_id: uid, kind });
  if (error) throw error;
  return true;
}

export async function addNoteComment(
  noteId: string, coupleId: string, body: string,
): Promise<VerseNoteResponse> {
  const uid = await myId();
  const { data, error } = await supabase
    .from('verse_note_responses')
    .insert({ note_id: noteId, couple_id: coupleId, user_id: uid, kind: 'comment', body: body.trim() })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as VerseNoteResponse;
}

export async function deleteNoteResponse(id: string) {
  const { error } = await supabase.from('verse_note_responses').delete().eq('id', id);
  if (error) throw error;
}

// How many remarks sit under each note in a chapter, so the reader can say so
// without loading every discussion. Reactions are not counted: they are ambient.
export async function commentCountsForNotes(noteIds: string[]): Promise<Record<string, number>> {
  if (noteIds.length === 0) return {};
  const { data, error } = await supabase
    .from('verse_note_responses')
    .select('note_id')
    .eq('kind', 'comment')
    .in('note_id', noteIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { note_id: string }[]) {
    counts[r.note_id] = (counts[r.note_id] ?? 0) + 1;
  }
  return counts;
}
