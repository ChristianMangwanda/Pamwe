const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k: string) => { delete mockStore[k]; return Promise.resolve(); }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { inviteLink, inviteMessage, takePendingInvite, PENDING_INVITE_KEY } from '../lib/invite';

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockStore)) delete mockStore[k];
});

describe('inviteLink', () => {
  it('carries the code on the app scheme', () => {
    expect(inviteLink('ABC123')).toBe('pamwe://join?invite=ABC123');
  });

  it('escapes anything that would break the query', () => {
    expect(inviteLink('A B&C')).toBe('pamwe://join?invite=A%20B%26C');
  });
});

describe('inviteMessage', () => {
  it('spells the code out as well as linking it', () => {
    // A custom-scheme link does nothing at all on a phone without the app, so
    // the six characters have to survive in the text.
    const msg = inviteMessage('ABC123');
    expect(msg).toContain('pamwe://join?invite=ABC123');
    expect(msg).toContain('ABC123');
    expect(msg).toMatch(/enter this code/i);
  });

  it('writes no em dash', () => {
    expect(inviteMessage('ABC123')).not.toContain('—');
  });
});

// The invited partner has not signed in yet, so a tapped link lands on welcome
// and the walk to the join screen takes several screens. The code has to
// survive that, and a relaunch.
describe('takePendingInvite', () => {
  it('returns the stashed code and consumes it', async () => {
    mockStore[PENDING_INVITE_KEY] = 'ABC123';
    await expect(takePendingInvite()).resolves.toBe('ABC123');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PENDING_INVITE_KEY);
    // Consumed: a stale code must not prefill a later, unrelated join.
    await expect(takePendingInvite()).resolves.toBeNull();
  });

  it('returns null when nothing is waiting', async () => {
    await expect(takePendingInvite()).resolves.toBeNull();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('survives storage throwing rather than blocking the join screen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('nope'));
    await expect(takePendingInvite()).resolves.toBeNull();
  });
});
