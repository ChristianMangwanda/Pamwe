import AsyncStorage from '@react-native-async-storage/async-storage';

// What the phone keeps when an account leaves it.
//
// Signing out used to clear the session and nothing else, so every couple-scoped
// cache stayed on disk: `pamwe:prayers:{id}`, `pamwe:reflections:{id}`,
// `pamwe:youStats:{id}`, the plan and plan-day caches, a pending voice
// recording. The screens read those caches before the network answers, which is
// why a signed-out phone could still show a couple's prayers.
//
// The rule is deliberately DEFAULT-DELETE: everything under the `pamwe:` prefix
// goes unless it is named below. A cache added next year is therefore cleared
// without anyone remembering to come back here, and the only way to keep
// something is to say so on purpose. That is the right way round for a list
// whose failure mode is leaving a couple's words on a phone they no longer own.
//
// Keys that are not ours are left alone, which matters for one in particular:
// supabase-js stores the session under `sb-<ref>-auth-token`, and removing that
// from underneath `signOut()` mid-flight is its problem to get wrong, not ours.
const DEVICE_KEYS = [
  // Chosen once, about this handset, and true for whoever is holding it.
  'pamwe:theme',
  'pamwe:readerScale',
  'pamwe:readerTranslation',
  'pamwe:verseNums',
  // Scripture. Public text, immutable, and expensive to fetch again: a reader
  // who has been through Psalms has megabytes of chapters cached, and none of
  // it says anything about them.
  'pamwe:chapter:',
  'pamwe:chapterIndex',
];

/** Does this key belong to the account (and so leave with it)? */
export function isAccountKey(key: string): boolean {
  if (!key.startsWith('pamwe:')) return false;
  return !DEVICE_KEYS.some((k) => key === k || key.startsWith(k));
}

/** Forget everything about the account that just left this phone.
 *
 *  Best effort by design: it runs after the session is already gone, so a
 *  failure here cannot strand anyone signed in. */
export async function clearAccountLocalData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const leaving = keys.filter(isAccountKey);
    if (leaving.length > 0) await AsyncStorage.multiRemove(leaving);
  } catch {
    // A phone that could not clear its caches is still signed out, and the next
    // sign-in overwrites them by couple id anyway.
  }
}
