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

import { createOrUpdateDraft, ensureVoiceDraft } from '../lib/entries';
import { supabase } from '../lib/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

// One chain per supabase.from() call. Each records what it was asked to do so
// the test can assert which path was taken.
function chainMock(result: { data?: any; error?: any } = {}) {
  const chain: any = {
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(() =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
    ),
    single: jest.fn(() =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
    ),
  };
  return chain;
}

const UNIQUE_VIOLATION = {
  code: '23505',
  details: null,
  hint: null,
  message:
    'duplicate key value violates unique constraint "entries_couple_plan_id_day_number_user_id_key"',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
});

// entries has UNIQUE (couple_plan_id, day_number, user_id). The journal
// autosaves on an interval AND saves again when Share is tapped, so on the
// first draft of a day both calls could see "no row yet" and both insert. The
// loser used to surface Postgres 23505 to the reader as "Couldn't send it:
// duplicate key value violates unique constraint..." (Sentry PAMWE-IOS-4).
describe('createOrUpdateDraft losing the insert race', () => {
  it('recovers by updating the row the other call created', async () => {
    const raced = { id: 'e1', submitted_at: null };
    const updated = { id: 'e1', text_content: 'my words', submitted_at: null };

    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))              // getMyEntry: nothing yet
      .mockReturnValueOnce(chainMock({ error: UNIQUE_VIOLATION })) // insert: lost the race
      .mockReturnValueOnce(chainMock({ data: raced }))             // getMyEntry: the winner's row
      .mockReturnValueOnce(chainMock({ data: updated }));          // update it instead

    await expect(createOrUpdateDraft('cp-1', 3, 'my words')).resolves.toEqual(updated);
  });

  it('never reopens an entry that was already sealed', async () => {
    const sealed = { id: 'e1', submitted_at: '2026-07-18T22:11:00.000Z' };

    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ error: UNIQUE_VIOLATION }))
      .mockReturnValueOnce(chainMock({ data: sealed }));

    await expect(createOrUpdateDraft('cp-1', 3, 'late autosave')).resolves.toEqual(sealed);
    // No 4th call: the update path must not run against a sealed row.
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it('still throws anything that is not a unique violation', async () => {
    const denied = { code: '42501', message: 'new row violates row-level security policy' };

    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ error: denied }));

    await expect(createOrUpdateDraft('cp-1', 3, 'x')).rejects.toEqual(denied);
  });
});

describe('ensureVoiceDraft losing the insert race', () => {
  it('recovers by switching the raced row to voice', async () => {
    const raced = { id: 'e1', entry_type: 'text', submitted_at: null };
    const voiced = { id: 'e1', entry_type: 'voice', submitted_at: null };

    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ error: UNIQUE_VIOLATION }))
      .mockReturnValueOnce(chainMock({ data: raced }))
      .mockReturnValueOnce(chainMock({ data: voiced }));

    await expect(ensureVoiceDraft('cp-1', 3)).resolves.toEqual(voiced);
  });

  it('leaves a raced row alone when it is already voice', async () => {
    const raced = { id: 'e1', entry_type: 'voice', submitted_at: null };

    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ error: UNIQUE_VIOLATION }))
      .mockReturnValueOnce(chainMock({ data: raced }));

    await expect(ensureVoiceDraft('cp-1', 3)).resolves.toEqual(raced);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});
