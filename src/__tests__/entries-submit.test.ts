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

import { submitEntry } from '../lib/entries';
import { supabase } from '../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

function chainMock(result: { data?: any; error?: any } = {}) {
  const chain: any = {
    update: jest.fn(() => chain),
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(() =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
    ),
  };
  return chain;
}

// Sealing an entry has to survive a repeat: Postgres commits the row before the
// response reaches the phone, so a dropped response looks exactly like a write
// that never happened and the reader sends again.
describe('submitEntry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the sealed row when the update lands', async () => {
    const row = { id: 'e1', submitted_at: '2026-07-14T10:00:00.000Z' };
    mockFrom.mockReturnValueOnce(chainMock({ data: row }));

    await expect(submitEntry('e1')).resolves.toEqual(row);
  });

  it('treats an already-sealed entry as success, keeping the first timestamp', async () => {
    // entries_update_own_draft is USING (submitted_at IS NULL), so once sealed
    // the row is invisible to the update and a retry matches zero rows.
    const sealed = { id: 'e1', submitted_at: '2026-07-14T10:00:00.000Z' };
    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ data: sealed }));

    await expect(submitEntry('e1')).resolves.toEqual(sealed);
  });

  it('throws when the row is neither updatable nor already sealed', async () => {
    mockFrom
      .mockReturnValueOnce(chainMock({ data: null }))
      .mockReturnValueOnce(chainMock({ data: { id: 'e1', submitted_at: null } }));

    await expect(submitEntry('e1')).rejects.toThrow();
  });

  it('surfaces a real update error rather than reading the row back', async () => {
    mockFrom.mockReturnValueOnce(chainMock({ error: { message: 'boom' } }));

    await expect(submitEntry('e1')).rejects.toEqual({ message: 'boom' });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
