jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn() }));
jest.mock('base64-arraybuffer', () => ({ decode: jest.fn() }));
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

import { getUnseenReveals, markRevealSeen } from '../lib/entries';
import { supabase } from '../lib/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

const ME = 'user-me';
const THEM = 'user-them';

/** One chain for the single select getUnseenReveals runs. */
function rowsChain(rows: any[] | null, error: any = null) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    lt: jest.fn(() => chain),
    not: jest.fn(() => Promise.resolve({ data: rows, error })),
  };
  return chain;
}

const row = (day: number, userId: string, seen: string | null = null) => ({
  day_number: day,
  user_id: userId,
  reveal_seen_at: seen,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: ME } } } });
});

// The day advances on EITHER partner's Amen, so the one who did not tap it can
// arrive at a fresh day having never watched the last reveal. Nothing on Today
// said so, because "seen" lived in this phone's AsyncStorage. These are the
// rules Today's waiting card is drawn from.
describe('getUnseenReveals', () => {
  it('offers a revealed day I have not watched', async () => {
    mockFrom.mockReturnValueOnce(rowsChain([row(3, ME), row(3, THEM)]));
    await expect(getUnseenReveals('cp-1', 4)).resolves.toEqual([3]);
  });

  it('stays quiet once I have watched it', async () => {
    mockFrom.mockReturnValueOnce(rowsChain([row(3, ME, '2026-08-09T10:00:00Z'), row(3, THEM)]));
    await expect(getUnseenReveals('cp-1', 4)).resolves.toEqual([]);
  });

  it('ignores a day only I sealed', async () => {
    // RLS returns a partner's entry only once you have both sealed, so a lone
    // row of mine means the day was never revealed and there is nothing to
    // offer back. This is the waiting screen's job, not the card's.
    mockFrom.mockReturnValueOnce(rowsChain([row(3, ME)]));
    await expect(getUnseenReveals('cp-1', 4)).resolves.toEqual([]);
  });

  it('returns several missed days oldest first', async () => {
    mockFrom.mockReturnValueOnce(rowsChain([
      row(5, THEM), row(5, ME),
      row(2, ME), row(2, THEM),
      row(4, ME, '2026-08-09T10:00:00Z'), row(4, THEM),
    ]));
    // Day 4 is watched, so only 2 and 5 are outstanding, and Today offers the
    // oldest of them first.
    await expect(getUnseenReveals('cp-1', 6)).resolves.toEqual([2, 5]);
  });

  it('asks only for days before the one they are on', async () => {
    const chain = rowsChain([]);
    mockFrom.mockReturnValueOnce(chain);
    await getUnseenReveals('cp-1', 7);
    // Today's own day is not a missed reveal: it is today's ritual, and the
    // CTA already carries it.
    expect(chain.lt).toHaveBeenCalledWith('day_number', 7);
    expect(chain.eq).toHaveBeenCalledWith('couple_plan_id', 'cp-1');
  });

  it('returns nothing when signed out rather than throwing', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(getUnseenReveals('cp-1', 4)).resolves.toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws when the read fails, so Today keeps its last good answer', async () => {
    mockFrom.mockReturnValueOnce(rowsChain(null, { message: 'network' }));
    await expect(getUnseenReveals('cp-1', 4)).rejects.toBeTruthy();
  });
});

describe('markRevealSeen', () => {
  it('goes through the RPC, because a sealed entry takes no client update', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await markRevealSeen('cp-1', 3);
    expect(mockRpc).toHaveBeenCalledWith('mark_reveal_seen', {
      p_couple_plan: 'cp-1',
      p_day: 3,
    });
  });

  it('throws on failure so callers can decide to ignore it', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'nope' } });
    await expect(markRevealSeen('cp-1', 3)).rejects.toBeTruthy();
  });
});
