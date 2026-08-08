import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { supabase } from './supabase';

const VOICE_BUCKET = 'voice-entries';
const AUDIO_EXTENSION = 'm4a';
const AUDIO_CONTENT_TYPE = 'audio/m4a';

function voiceObjectPath(couplePlanId: string, dayNumber: number, userId: string) {
  return `${couplePlanId}/${dayNumber}/${userId}.${AUDIO_EXTENSION}`;
}

export async function getMyEntry(couplePlanId: string, dayNumber: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('couple_plan_id', couplePlanId)
    .eq('day_number', dayNumber)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPartnerEntry(couplePlanId: string, dayNumber: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('couple_plan_id', couplePlanId)
    .eq('day_number', dayNumber)
    .neq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// entries has UNIQUE (couple_plan_id, day_number, user_id), so the
// read-then-insert below is a race: the journal autosaves on an interval AND
// the Share button saves before submitting, so tapping Share while the first
// autosave is still in flight had both calls see "no row yet" and both insert.
// The loser got Postgres 23505, and because nothing was submitted yet the
// landedAnyway() check couldn't rescue it, so the raw constraint text was shown
// to the user as "Couldn't send it" (Sentry PAMWE-IOS-4, build 14).
//
// Losing that race is not a failure: the row the other call created is exactly
// the row we wanted. Re-read and take the update path.
const UNIQUE_VIOLATION = '23505';

export async function createOrUpdateDraft(
  couplePlanId: string,
  dayNumber: number,
  textContent: string,
) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const writeText = async (entry: any) => {
    // A sealed entry is final; never let a late autosave reopen it.
    if (entry.submitted_at) return entry;

    const { data, error } = await supabase
      .from('entries')
      .update({
        text_content: textContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const existing = await getMyEntry(couplePlanId, dayNumber);
  if (existing) return writeText(existing);

  const { data, error } = await supabase
    .from('entries')
    .insert({
      couple_plan_id: couplePlanId,
      day_number: dayNumber,
      user_id: user.id,
      entry_type: 'text',
      text_content: textContent,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      const raced = await getMyEntry(couplePlanId, dayNumber);
      if (raced) return writeText(raced);
    }
    throw error;
  }
  return data;
}

// Sealing an entry has to be safe to repeat. Postgres commits the row before
// the response reaches us, so a dropped response is indistinguishable from a
// write that never happened, and the natural reaction is to send again. But
// entries_update_own_draft is USING (submitted_at IS NULL), so once sealed the
// row is invisible to this update and a second attempt matches zero rows.
// Read the row back rather than failing: an entry that is already submitted
// means the first attempt landed, so report that first timestamp as the truth.
export async function submitEntry(entryId: string) {
  const { data, error } = await supabase
    .from('entries')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', entryId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: existing, error: readError } = await supabase
    .from('entries')
    .select()
    .eq('id', entryId)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.submitted_at) return existing;
  throw new Error('Your words are saved. Try sending them again.');
}

export async function ensureVoiceDraft(couplePlanId: string, dayNumber: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const asVoice = async (entry: any) => {
    if (entry.submitted_at) return entry;
    if (entry.entry_type === 'voice') return entry;

    const { data, error } = await supabase
      .from('entries')
      .update({ entry_type: 'voice', updated_at: new Date().toISOString() })
      .eq('id', entry.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const existing = await getMyEntry(couplePlanId, dayNumber);
  if (existing) return asVoice(existing);

  const { data, error } = await supabase
    .from('entries')
    .insert({
      couple_plan_id: couplePlanId,
      day_number: dayNumber,
      user_id: user.id,
      entry_type: 'voice',
    })
    .select()
    .single();

  // Same race as createOrUpdateDraft: switching to voice while a text autosave
  // is in flight can lose the insert. The row is the one we wanted.
  if (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      const raced = await getMyEntry(couplePlanId, dayNumber);
      if (raced) return asVoice(raced);
    }
    throw error;
  }
  return data;
}

export async function uploadVoiceRecording(
  couplePlanId: string,
  dayNumber: number,
  localFileUri: string,
) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const objectPath = voiceObjectPath(couplePlanId, dayNumber, user.id);

  let bytes: ArrayBuffer;
  try {
    bytes = await new File(localFileUri).arrayBuffer();
  } catch {
    const base64 = await readAsStringAsync(localFileUri, { encoding: 'base64' });
    bytes = decode(base64);
  }

  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: AUDIO_CONTENT_TYPE,
      upsert: true,
    });

  if (error) throw error;
  return objectPath;
}

// Attach the audio and seal, in ONE write. These were two round trips, which
// cost the sender a wait for no gain and left a window where an entry carried
// audio but was not sealed. entries_update_own_draft is
// USING (submitted_at IS NULL) WITH CHECK (user_id = auth.uid()), so a single
// statement that fills both passes: the row is still a draft when USING is
// evaluated. Idempotent the same way submitEntry is, and for the same reason:
// the seal commits before the response lands, so zero rows means it already
// went through. The transcript is not written here; it catches up later through
// set_entry_transcript.
export async function submitVoiceEntry(
  entryId: string,
  audioUrl: string,
  durationSeconds: number,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('entries')
    .update({
      audio_url: audioUrl,
      audio_duration_seconds: durationSeconds,
      entry_type: 'voice',
      submitted_at: now,
      updated_at: now,
    })
    .eq('id', entryId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: existing, error: readError } = await supabase
    .from('entries')
    .select()
    .eq('id', entryId)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.submitted_at) return existing;
  throw new Error('Your recording is still here. Try sending it again.');
}

// Attach a transcript to an already-sealed voice entry. Goes through an RPC
// because entries_update_own_draft stops at submitted_at, and the function
// only fills a still-null transcript, so this can never revise a reflection.
// Best-effort by design: a failure leaves the entry exactly as it shipped.
export async function saveTranscript(entryId: string, transcript: string) {
  const { error } = await supabase.rpc('set_entry_transcript', {
    p_entry_id: entryId,
    p_transcript: transcript,
  });
  if (error) throw error;
}

export async function countMySubmittedEntries(couplePlanId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;

  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('couple_plan_id', couplePlanId)
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null);

  if (error) throw error;
  return count ?? 0;
}

// The couple's couple_plan ids — the scope for the couple-wide counts below.
// The counts throw on failure instead of returning a lying zero: the You tab
// keeps its last-good numbers when a query blips.
async function couplePlanIds(coupleId: string): Promise<string[]> {
  const { data, error } = await supabase.from('couple_plans').select('id').eq('couple_id', coupleId);
  if (error) throw error;
  return (data ?? []).map((c) => c.id);
}

// "Days read" (You tab) — my submitted entries across all the couple's plans.
export async function countMyTotalSubmitted(coupleId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return 0;
  const cpIds = await couplePlanIds(coupleId);
  if (cpIds.length === 0) return 0;
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .in('couple_plan_id', cpIds)
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

// "Reflections" (You tab) — every submitted reflection visible to me (mine + the
// partner's revealed ones), across the couple's plans.
export async function countCoupleReflections(coupleId: string) {
  const cpIds = await couplePlanIds(coupleId);
  if (cpIds.length === 0) return 0;
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .in('couple_plan_id', cpIds)
    .not('submitted_at', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

export async function getSignedAudioUrl(objectPath: string, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
