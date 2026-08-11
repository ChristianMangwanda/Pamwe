import { supabase } from './supabase';

// Leaving a pair, and reading what is left afterwards.
//
// The archive is not a copy of anything: it is the same rows, still governed by
// the same policies, reached through membership in a sealed couple rather than
// through "the couple I am currently in". Nothing was duplicated on the way out,
// so nothing can drift from what actually happened.

export interface ArchiveCouple {
  id: string;
  left_at: string | null;
  left_by: string | null;
  farewell_note: string | null;
  farewell_read_at: string | null;
  paired_at: string | null;
  partner_a_id: string;
  partner_b_id: string | null;
}

export interface ArchiveEntry {
  id: string;
  day_number: number;
  user_id: string;
  text_content: string | null;
  transcript: string | null;
  submitted_at: string;
  reference: string | null;
}

/** Every sealed couple this person was in, newest first. */
export async function myArchives(): Promise<ArchiveCouple[]> {
  const { data, error } = await supabase
    .from('couples')
    .select('id, left_at, left_by, farewell_note, farewell_read_at, paired_at, partner_a_id, partner_b_id')
    .not('left_at', 'is', null)
    .order('left_at', { ascending: false });
  if (error) throw error;
  return (data as ArchiveCouple[]) ?? [];
}

/** Days read together and notes written, counted in the database.
 *
 *  The closed screen shows both numbers before the archive is opened, and a
 *  couple three years in have thousands of rows behind them. Returns nothing at
 *  all to somebody who was not in the couple, rather than a zero, because a zero
 *  would still confirm that the couple exists. */
export async function archiveSummary(coupleId: string): Promise<{ days: number; notes: number }> {
  const { data, error } = await supabase.rpc('archive_summary' as never, { p_couple: coupleId } as never);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { days: (row as any)?.days ?? 0, notes: (row as any)?.notes ?? 0 };
}

/** The reflections themselves, newest first.
 *
 *  What comes back is whatever RLS allows, which is deliberately not
 *  "everything": a day only one of you ever wrote stays shut, exactly as it was
 *  while you were together. Leaving is not a way to collect a reveal.
 */
export async function archiveEntries(coupleId: string, limit = 200): Promise<ArchiveEntry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, day_number, user_id, text_content, transcript, submitted_at, couple_plan_id, couple_plans!inner(couple_id, plan_id)')
    .eq('couple_plans.couple_id', coupleId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as any[]) ?? []).map((e) => ({
    id: e.id,
    day_number: e.day_number,
    user_id: e.user_id,
    text_content: e.text_content,
    transcript: e.transcript,
    submitted_at: e.submitted_at,
    reference: null,
  }));
}

/** End the partnership. One transaction: both people are freed, any pending
 *  request is withdrawn, an open pause is closed and the plan is stopped. */
export async function leaveCouple(note?: string | null): Promise<ArchiveCouple> {
  const { data, error } = await supabase.rpc('leave_couple' as never, { p_note: note ?? null } as never);
  if (error) throw error;
  return data as ArchiveCouple;
}

/** Stamp the farewell note as read. Refused for the person who wrote it, so
 *  "she reads it once" is true of the database rather than of one screen. */
export async function markFarewellRead(coupleId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_farewell_read' as never, { p_couple: coupleId } as never);
  if (error) throw error;
}

/** One file, all the notes, in the order they were written.
 *
 *  Plain text rather than JSON: the handoff calls this "keep a copy first", and
 *  a copy you keep is one a person can still read in ten years without the app
 *  that made it. */
export function exportText(
  entries: ArchiveEntry[],
  names: Record<string, string>,
  sealedOn: string | null,
): string {
  const header = [
    'Pamwe',
    sealedOn ? `Read together until ${new Date(sealedOn).toLocaleDateString()}` : '',
    `${entries.length} reflections`,
    '',
    '',
  ].filter(Boolean).join('\n');

  const body = [...entries]
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
    .map((e) => {
      const when = new Date(e.submitted_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const who = names[e.user_id] ?? 'Someone';
      const words = e.text_content?.trim() || e.transcript?.trim() || '(a voice reflection)';
      return `${when} · Day ${e.day_number}\n${who}\n\n${words}\n`;
    })
    .join('\n----------------------------------------\n\n');

  return `${header}${body}`;
}
