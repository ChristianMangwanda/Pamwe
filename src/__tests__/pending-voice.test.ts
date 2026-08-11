const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k: string) => { delete mockStore[k]; return Promise.resolve(); }),
}));

const mockExists = { value: true };
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ get exists() { return mockExists.value; } })),
}));

import { getPendingVoice, rememberPendingVoice, forgetPendingVoice } from '../lib/pendingVoice';

const CP = 'cp-1';
const DAY = 3;
const KEY = `pamwe:pendingVoice:${CP}:${DAY}`;

beforeEach(() => {
  jest.clearAllMocks();
  mockExists.value = true;
  for (const k of Object.keys(mockStore)) delete mockStore[k];
});

// "Your recording is still here" was only true while the journal screen stayed
// mounted: the recorder held the preview, and walking away lost the pointer to
// a file still sitting in the cache.
describe('pendingVoice', () => {
  it('remembers a recording that failed to send', async () => {
    await rememberPendingVoice(CP, DAY, { uri: 'file:///take.m4a', durationSeconds: 42 });
    await expect(getPendingVoice(CP, DAY)).resolves.toEqual({
      uri: 'file:///take.m4a',
      durationSeconds: 42,
    });
  });

  it('keeps each day separate', async () => {
    await rememberPendingVoice(CP, DAY, { uri: 'file:///take.m4a', durationSeconds: 42 });
    await expect(getPendingVoice(CP, DAY + 1)).resolves.toBeNull();
  });

  it('forgets on request', async () => {
    await rememberPendingVoice(CP, DAY, { uri: 'file:///take.m4a', durationSeconds: 42 });
    await forgetPendingVoice(CP, DAY);
    await expect(getPendingVoice(CP, DAY)).resolves.toBeNull();
  });

  it('does not offer a recording the phone has already cleared', async () => {
    // iOS empties its cache directory under storage pressure, so a stored
    // pointer is not proof of a file. Offering to send something that is gone
    // would be a worse lie than saying nothing.
    await rememberPendingVoice(CP, DAY, { uri: 'file:///gone.m4a', durationSeconds: 12 });
    mockExists.value = false;
    await expect(getPendingVoice(CP, DAY)).resolves.toBeNull();
    // and it cleans up after itself, so it is not re-checked every mount.
    expect(mockStore[KEY]).toBeUndefined();
  });

  it('discards a corrupt record instead of throwing on the journal screen', async () => {
    mockStore[KEY] = 'not json';
    await expect(getPendingVoice(CP, DAY)).resolves.toBeNull();
    expect(mockStore[KEY]).toBeUndefined();
  });

  it('discards a record with no file path', async () => {
    mockStore[KEY] = JSON.stringify({ durationSeconds: 9 });
    await expect(getPendingVoice(CP, DAY)).resolves.toBeNull();
  });

  it('treats a missing duration as zero rather than failing', async () => {
    mockStore[KEY] = JSON.stringify({ uri: 'file:///take.m4a' });
    await expect(getPendingVoice(CP, DAY)).resolves.toEqual({
      uri: 'file:///take.m4a',
      durationSeconds: 0,
    });
  });
});
