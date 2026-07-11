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

export async function createOrUpdateDraft(
  couplePlanId: string,
  dayNumber: number,
  textContent: string,
) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const existing = await getMyEntry(couplePlanId, dayNumber);

  if (existing) {
    if (existing.submitted_at) return existing;

    const { data, error } = await supabase
      .from('entries')
      .update({
        text_content: textContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

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

  if (error) throw error;
  return data;
}

export async function submitEntry(entryId: string) {
  const { data, error } = await supabase
    .from('entries')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function ensureVoiceDraft(couplePlanId: string, dayNumber: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const existing = await getMyEntry(couplePlanId, dayNumber);

  if (existing) {
    if (existing.submitted_at) return existing;
    if (existing.entry_type === 'voice') return existing;

    const { data, error } = await supabase
      .from('entries')
      .update({ entry_type: 'voice', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

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

  if (error) throw error;
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

export async function attachAudioToEntry(
  entryId: string,
  audioUrl: string,
  durationSeconds: number,
) {
  const { data, error } = await supabase
    .from('entries')
    .update({
      audio_url: audioUrl,
      audio_duration_seconds: durationSeconds,
      entry_type: 'voice',
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
