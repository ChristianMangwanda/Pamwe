import { supabase } from './supabase';

// Dreams are a couple-shared journal: both partners read every dream, only the
// author edits or deletes their own. Same seam as lib/prayers - the caller
// passes coupleId in from useCouple(), and only writes need the author's
// identity (via getSession, never getUser).

export async function getDreams(coupleId: string) {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createDream(coupleId: string, text: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('dreams')
    .insert({ couple_id: coupleId, author_id: user.id, text: text.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDream(dreamId: string, text: string) {
  const { data, error } = await supabase
    .from('dreams')
    .update({ text: text.trim() })
    .eq('id', dreamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDream(dreamId: string) {
  const { error } = await supabase.from('dreams').delete().eq('id', dreamId);
  if (error) throw error;
}
