import AsyncStorage from '@react-native-async-storage/async-storage';

/** A pairing code that arrived by link before there was an account to use it.
 *
 *  The invited partner is by definition someone who has not signed in yet, so
 *  a tapped invite almost always lands on the welcome screen. Stashing it means
 *  the code survives the whole sign-up walk and the join screen can fill itself
 *  in when they finally get there. */
export const PENDING_INVITE_KEY = 'pamwe:pendingInvite';

/** The link that carries a code.
 *
 *  Custom scheme, not a universal link: those need a domain and an
 *  apple-app-site-association file, and Pamwe has neither yet. The message
 *  still spells the code out, because a custom-scheme link does nothing at all
 *  on a phone without the app, and "it did nothing" is a worse first impression
 *  than typing six characters. */
export function inviteLink(code: string): string {
  return `pamwe://join?invite=${encodeURIComponent(code)}`;
}

export function inviteMessage(code: string): string {
  return [
    'I want us to read the Bible together, a little each day. Join me on Pamwe.',
    '',
    `Tap to link with me: ${inviteLink(code)}`,
    '',
    `Or enter this code in the app: ${code}`,
  ].join('\n');
}

export async function takePendingInvite(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (code) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}
