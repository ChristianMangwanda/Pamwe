import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

/** A recording that was made but never landed.
 *
 *  The failure copy already promised "your recording is still here", and while
 *  the journal screen stayed mounted that was true: the recorder holds its own
 *  preview. Leave the screen and the pointer went with it, so the file sat
 *  orphaned in the cache and the promise was quietly false.
 *
 *  This is deliberately NOT a general offline outbox. It remembers one
 *  recording per day, on the device that made it, and the send is still the
 *  send: nothing is uploaded in the background, and a recording still leaves
 *  the phone only when someone taps Send.
 */
export type PendingVoice = { uri: string; durationSeconds: number };

const key = (couplePlanId: string, dayNumber: number) =>
  `pamwe:pendingVoice:${couplePlanId}:${dayNumber}`;

export async function rememberPendingVoice(
  couplePlanId: string,
  dayNumber: number,
  pending: PendingVoice,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(couplePlanId, dayNumber), JSON.stringify(pending));
  } catch {
    // A recording we cannot remember is the situation we already had.
  }
}

export async function forgetPendingVoice(couplePlanId: string, dayNumber: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(couplePlanId, dayNumber));
  } catch {
    // Nothing to do: the worst case is one stale offer, and the file check below
    // discards it anyway.
  }
}

/** The remembered recording, if the audio is genuinely still on the phone.
 *
 *  iOS clears its cache directory under storage pressure, so a stored pointer
 *  is not proof of a file. Offering to send something that no longer exists
 *  would be a worse lie than saying nothing. */
export async function getPendingVoice(
  couplePlanId: string,
  dayNumber: number,
): Promise<PendingVoice | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key(couplePlanId, dayNumber));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: PendingVoice;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await forgetPendingVoice(couplePlanId, dayNumber);
    return null;
  }
  if (!parsed?.uri) {
    await forgetPendingVoice(couplePlanId, dayNumber);
    return null;
  }

  try {
    if (!new File(parsed.uri).exists) {
      await forgetPendingVoice(couplePlanId, dayNumber);
      return null;
    }
  } catch {
    await forgetPendingVoice(couplePlanId, dayNumber);
    return null;
  }

  return { uri: parsed.uri, durationSeconds: parsed.durationSeconds ?? 0 };
}
