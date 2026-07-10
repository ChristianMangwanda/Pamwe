jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));
jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

import {
  ensureVoiceDraft,
  uploadVoiceRecording,
  attachAudioToEntry,
} from '../lib/entries';
import { supabase } from '../lib/supabase';
import { File } from 'expo-file-system';

const mockGetSession = supabase.auth.getSession as jest.Mock;

// entries.ts reads the signed-in user from the local session (getSession).
function mockSignedInUser(user: { id: string } | null) {
  mockGetSession.mockResolvedValue({ data: { session: user ? { user } : null } });
}
const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;
const MockedFile = File as unknown as jest.Mock;

function chainMock(overrides: { data?: any; error?: any } = {}) {
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    neq: jest.fn(() => chain),
    maybeSingle: jest.fn(() =>
      Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
    ),
    single: jest.fn(() =>
      Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
    ),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ensureVoiceDraft', () => {
  it('inserts a new entry with entry_type=voice when none exists', async () => {
    mockSignedInUser({ id: 'user-1' });

    const lookupChain = chainMock({ data: null });
    const insertChain = chainMock({ data: { id: 'entry-1', entry_type: 'voice' } });

    let firstCall = true;
    mockFrom.mockImplementation((table: string) => {
      expect(table).toBe('entries');
      if (firstCall) {
        firstCall = false;
        return lookupChain;
      }
      return insertChain;
    });

    const result = await ensureVoiceDraft('cp-1', 5);

    expect(result).toEqual({ id: 'entry-1', entry_type: 'voice' });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_plan_id: 'cp-1',
        day_number: 5,
        user_id: 'user-1',
        entry_type: 'voice',
      }),
    );
  });

  it('flips an existing text draft to voice', async () => {
    mockSignedInUser({ id: 'user-1' });

    const existing = {
      id: 'entry-1',
      entry_type: 'text',
      submitted_at: null,
      text_content: 'half written',
    };
    const lookupChain = chainMock({ data: existing });
    const updateChain = chainMock({ data: { ...existing, entry_type: 'voice' } });

    let lookupReturned = false;
    mockFrom.mockImplementation(() => {
      if (!lookupReturned) {
        lookupReturned = true;
        return lookupChain;
      }
      return updateChain;
    });

    const result = await ensureVoiceDraft('cp-1', 5);

    expect(result.entry_type).toBe('voice');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ entry_type: 'voice' }),
    );
  });

  it('returns the existing entry untouched when already voice', async () => {
    mockSignedInUser({ id: 'user-1' });

    const existing = { id: 'entry-1', entry_type: 'voice', submitted_at: null };
    const lookupChain = chainMock({ data: existing });
    mockFrom.mockReturnValue(lookupChain);

    const result = await ensureVoiceDraft('cp-1', 5);

    expect(result).toBe(existing);
    expect(lookupChain.update).not.toHaveBeenCalled();
    expect(lookupChain.insert).not.toHaveBeenCalled();
  });

  it('returns submitted entries without modification', async () => {
    mockSignedInUser({ id: 'user-1' });

    const existing = {
      id: 'entry-1',
      entry_type: 'text',
      submitted_at: '2026-05-28T12:00:00Z',
    };
    const lookupChain = chainMock({ data: existing });
    mockFrom.mockReturnValue(lookupChain);

    const result = await ensureVoiceDraft('cp-1', 5);

    expect(result).toBe(existing);
    expect(lookupChain.update).not.toHaveBeenCalled();
  });
});

describe('uploadVoiceRecording', () => {
  it('uploads to the canonical {couple_plan_id}/{day}/{user_id}.m4a path with audio/m4a', async () => {
    mockSignedInUser({ id: 'user-1' });

    const fakeBuffer = new ArrayBuffer(8);
    MockedFile.mockImplementation(() => ({
      arrayBuffer: () => Promise.resolve(fakeBuffer),
    }));

    const uploadMock = jest.fn(() => Promise.resolve({ data: { path: 'whatever' }, error: null }));
    mockStorageFrom.mockReturnValue({ upload: uploadMock });

    const path = await uploadVoiceRecording('cp-1', 5, 'file:///tmp/rec.m4a');

    expect(path).toBe('cp-1/5/user-1.m4a');
    expect(mockStorageFrom).toHaveBeenCalledWith('voice-entries');
    expect(uploadMock).toHaveBeenCalledWith(
      'cp-1/5/user-1.m4a',
      fakeBuffer,
      expect.objectContaining({
        contentType: 'audio/m4a',
        upsert: true,
      }),
    );
  });

  it('falls back to base64 read when File.arrayBuffer throws', async () => {
    mockSignedInUser({ id: 'user-1' });

    MockedFile.mockImplementation(() => ({
      arrayBuffer: () => Promise.reject(new Error('new API unavailable')),
    }));

    const { readAsStringAsync } = require('expo-file-system/legacy');
    (readAsStringAsync as jest.Mock).mockResolvedValue('AAAA');

    const fakeDecoded = new ArrayBuffer(3);
    const { decode } = require('base64-arraybuffer');
    (decode as jest.Mock).mockReturnValue(fakeDecoded);

    const uploadMock = jest.fn(() => Promise.resolve({ data: { path: 'p' }, error: null }));
    mockStorageFrom.mockReturnValue({ upload: uploadMock });

    await uploadVoiceRecording('cp-1', 5, 'file:///tmp/rec.m4a');

    expect(readAsStringAsync).toHaveBeenCalledWith(
      'file:///tmp/rec.m4a',
      { encoding: 'base64' },
    );
    expect(decode).toHaveBeenCalledWith('AAAA');
    expect(uploadMock).toHaveBeenCalledWith(
      'cp-1/5/user-1.m4a',
      fakeDecoded,
      expect.any(Object),
    );
  });

  it('throws on storage upload error', async () => {
    mockSignedInUser({ id: 'user-1' });

    MockedFile.mockImplementation(() => ({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    }));

    mockStorageFrom.mockReturnValue({
      upload: jest.fn(() =>
        Promise.resolve({ data: null, error: { message: 'denied by RLS' } }),
      ),
    });

    await expect(
      uploadVoiceRecording('cp-1', 5, 'file:///tmp/rec.m4a'),
    ).rejects.toEqual({ message: 'denied by RLS' });
  });
});

describe('attachAudioToEntry', () => {
  it('writes audio_url, audio_duration_seconds, entry_type=voice on the entry row', async () => {
    const updateChain = chainMock({
      data: { id: 'entry-1', audio_url: 'cp-1/5/user-1.m4a' },
    });
    mockFrom.mockReturnValue(updateChain);

    await attachAudioToEntry('entry-1', 'cp-1/5/user-1.m4a', 47);

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        audio_url: 'cp-1/5/user-1.m4a',
        audio_duration_seconds: 47,
        entry_type: 'voice',
      }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'entry-1');
  });
});
