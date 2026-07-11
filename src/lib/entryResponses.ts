import { supabase } from './supabase';

// Responses a partner leaves on a revealed reflection: a heart, an "amen", a
// short reply, or a saved line ("what stuck with me"). RLS (entry_responses)
// enforces that these only exist on mutually revealed days and that you respond
// to your partner's entry, never your own.

export type ResponseKind = 'heart' | 'amen' | 'reply' | 'quote';

export type EntryResponse = {
  id: string;
  entry_id: string;
  author_id: string;
  kind: ResponseKind;
  body: string | null;
  created_at: string;
};

// All responses for a revealed day, keyed by the entry they're on. One query;
// the caller splits mine-vs-partner by entry ownership.
export async function getResponsesForDay(
  couplePlanId: string,
  dayNumber: number,
): Promise<Record<string, EntryResponse[]>> {
  const { data, error } = await supabase
    .from('entry_responses')
    .select('id, entry_id, author_id, kind, body, created_at')
    .eq('couple_plan_id', couplePlanId)
    .eq('day_number', dayNumber)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const byEntry: Record<string, EntryResponse[]> = {};
  for (const r of (data ?? []) as EntryResponse[]) {
    (byEntry[r.entry_id] ??= []).push(r);
  }
  return byEntry;
}

async function myId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// Heart / amen toggle: tap once to add, again to remove (the partial unique
// index keeps it one-per-kind). Returns the new on/off state.
export async function toggleReaction(
  entryId: string,
  couplePlanId: string,
  dayNumber: number,
  kind: 'heart' | 'amen',
): Promise<boolean> {
  const uid = await myId();
  if (!uid) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('entry_responses')
    .select('id')
    .eq('entry_id', entryId)
    .eq('author_id', uid)
    .eq('kind', kind)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('entry_responses').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('entry_responses').insert({
    entry_id: entryId, couple_plan_id: couplePlanId, day_number: dayNumber, author_id: uid, kind,
  });
  if (error) throw error;
  return true;
}

export async function addReply(
  entryId: string, couplePlanId: string, dayNumber: number, body: string,
): Promise<EntryResponse> {
  const uid = await myId();
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('entry_responses')
    .insert({ entry_id: entryId, couple_plan_id: couplePlanId, day_number: dayNumber, author_id: uid, kind: 'reply', body: body.trim() })
    .select('id, entry_id, author_id, kind, body, created_at')
    .single();
  if (error) throw error;
  return data as EntryResponse;
}

// "What stuck with me": save a line from the partner's reflection.
export async function saveQuote(
  entryId: string, couplePlanId: string, dayNumber: number, quotedText: string,
): Promise<EntryResponse> {
  const uid = await myId();
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('entry_responses')
    .insert({ entry_id: entryId, couple_plan_id: couplePlanId, day_number: dayNumber, author_id: uid, kind: 'quote', body: quotedText.trim() })
    .select('id, entry_id, author_id, kind, body, created_at')
    .single();
  if (error) throw error;
  return data as EntryResponse;
}

export async function deleteResponse(id: string) {
  const { error } = await supabase.from('entry_responses').delete().eq('id', id);
  if (error) throw error;
}
