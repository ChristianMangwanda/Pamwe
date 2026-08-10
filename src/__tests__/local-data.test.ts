import { isAccountKey } from '../lib/localData';

// The point of this test is not that the function works, it is that the LIST is
// deliberate. Every key the app writes is named here on one side or the other,
// so adding a cache without deciding which side it falls on shows up as a
// failing test rather than as a couple's prayers left on a phone.

describe('what leaves the phone with the account', () => {
  const ACCOUNT_KEYS = [
    'pamwe:prayers:cccccccc-0000-0000-0000-000000000000',
    'pamwe:reflections:cccccccc-0000-0000-0000-000000000000',
    'pamwe:youStats:cccccccc-0000-0000-0000-000000000000',
    'pamwe:plansBrowse',
    'pamwe:plan:11111111-0000-0000-0000-000000000000',
    'pamwe:planDay:11111111-0000-0000-0000-000000000000:4',
    'pamwe:pendingVoice:22222222-0000-0000-0000-000000000000:4',
    'pamwe:pushToken',
    'pamwe:prayerReminders',
    'pamwe:pendingInvite',
    'pamwe:onbIntent',
  ];

  const DEVICE_KEYS = [
    'pamwe:theme',
    'pamwe:readerScale',
    'pamwe:readerTranslation',
    'pamwe:verseNums',
    'pamwe:chapter:John.3.WEB',
    'pamwe:chapterIndex',
  ];

  it.each(ACCOUNT_KEYS)('clears %s', (key) => {
    expect(isAccountKey(key)).toBe(true);
  });

  it.each(DEVICE_KEYS)('keeps %s', (key) => {
    expect(isAccountKey(key)).toBe(false);
  });

  it('never touches another library\'s keys', () => {
    // supabase-js keeps the session here and removes it itself inside
    // signOut(). Pulling it out from underneath that is how you get a client
    // that thinks it is signed in and a store that disagrees.
    expect(isAccountKey('sb-jcyhhxgomhopkoqesbkb-auth-token')).toBe(false);
    expect(isAccountKey('EXPO_CONSTANTS_INSTALLATION_ID')).toBe(false);
  });

  it('clears a cache key nobody has written yet', () => {
    // Default-delete. A key added next year leaves with the account unless
    // somebody deliberately adds it to the device list, which is the safe way
    // round for a rule whose failure mode is leaving words on a stranger's
    // phone.
    expect(isAccountKey('pamwe:somethingInventedLater:abc')).toBe(true);
  });
});
