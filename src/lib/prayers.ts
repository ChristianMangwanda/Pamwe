import { supabase } from './supabase';

export type PrayerStatus = 'active' | 'answered';
export type PrayerCategory = 'family' | 'health' | 'work' | 'guidance' | 'thanks' | 'other';

export const PRAYER_CATEGORIES: PrayerCategory[] = ['family', 'health', 'work', 'guidance', 'thanks', 'other'];
export const CATEGORY_LABEL: Record<PrayerCategory, string> = {
  family: 'Family', health: 'Health', work: 'Work', guidance: 'Guidance', thanks: 'Thanks', other: 'Other',
};

// "Today" in the couple's timezone — the same source the streak system uses —
// so a mark inserted and a mark read resolve to the same calendar day regardless
// of the device's UTC offset. en-CA formats as YYYY-MM-DD, which Postgres reads
// as a date literal.
function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
  }).format(new Date());
}

export async function getPrayers(coupleId: string, status: PrayerStatus = 'active') {
  const orderColumn = status === 'answered' ? 'answered_at' : 'created_at';

  const { data, error } = await supabase
    .from('prayers')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('status', status)
    .order(orderColumn, { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAnsweredPrayers(coupleId: string) {
  return getPrayers(coupleId, 'answered');
}

export async function createPrayer(
  coupleId: string,
  text: string,
  notifyPartner: boolean,
  category: PrayerCategory = 'other',
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('prayers')
    .insert({
      couple_id: coupleId,
      author_id: user.id,
      text: text.trim(),
      notify_partner: notifyPartner,
      category,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Edit an existing prayer's text/category. RLS + the UI both scope this to the
// author (the edit flow only opens for your own prayers).
export async function updatePrayer(prayerId: string, text: string, category: PrayerCategory) {
  const { data, error } = await supabase
    .from('prayers')
    .update({ text: text.trim(), category })
    .eq('id', prayerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Author-only delete (enforced by the prayers_delete RLS policy).
export async function deletePrayer(prayerId: string) {
  const { error } = await supabase.from('prayers').delete().eq('id', prayerId);
  if (error) throw error;
}

// Both partners' marks for today, scoped to the couple by RLS. The caller maps
// each row's user_id to "me" vs "partner".
export async function getTodayMarks(timezone: string) {
  const { data, error } = await supabase
    .from('prayer_marks')
    .select('prayer_id, user_id')
    .eq('marked_date', todayInTimezone(timezone));

  if (error) throw error;
  return data ?? [];
}

export async function markPrayedFor(prayerId: string, timezone: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // One mark per user per prayer per day — a repeat tap is a no-op, not an error.
  const { error } = await supabase
    .from('prayer_marks')
    .upsert(
      {
        prayer_id: prayerId,
        user_id: user.id,
        marked_date: todayInTimezone(timezone),
      },
      { onConflict: 'prayer_id,user_id,marked_date', ignoreDuplicates: true },
    );

  if (error) throw error;
}

// "Prayers" (You tab) — all prayer points for the couple, active + answered.
export async function countPrayers(coupleId: string) {
  const { count } = await supabase
    .from('prayers')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId);
  return count ?? 0;
}

export async function markAnswered(prayerId: string, note?: string) {
  const { data, error } = await supabase
    .from('prayers')
    .update({
      status: 'answered',
      answered_at: new Date().toISOString(),
      answer_note: note?.trim() || null,
    })
    .eq('id', prayerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
