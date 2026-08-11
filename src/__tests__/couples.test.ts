import { createCouple, joinCouple, regenerateInviteCode, getUserCouple } from '../lib/couples';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

// couples.ts reads the signed-in user from the local session (getSession).
function mockSignedInUser(user: { id: string } | null) {
  mockGetSession.mockResolvedValue({ data: { session: user ? { user } : null } });
}

function chainMock(overrides: Record<string, any> = {}) {
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    gt: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null })),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// Pairing is three SECURITY DEFINER functions since 20260808000001: the invite
// code, the expiry and the couple-plus-profile write all live in the database, so
// what is left to test here is that each call goes to the right RPC and that its
// error reaches the screen intact. The rules themselves (a 6-char code, a 7-day
// expiry, refusing your own invite, refusing a spent one) are asserted against a
// real database in scripts/rls_probe.sql, where they are actually enforced.
describe('createCouple', () => {
  it('throws if not authenticated', async () => {
    mockSignedInUser(null);
    await expect(createCouple()).rejects.toThrow('Not authenticated');
  });

  it('creates the couple through the RPC and returns it', async () => {
    mockSignedInUser({ id: 'user-1' });
    const coupleData = { id: 'couple-1', invite_code: 'ABC123', partner_a_id: 'user-1' };
    mockRpc.mockResolvedValue({ data: coupleData, error: null });

    const result = await createCouple();

    expect(result).toEqual(coupleData);
    expect(mockRpc).toHaveBeenCalledWith('create_couple', expect.any(Object));
    // Never a direct write: the couples table is no longer client-writable.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('passes the device IANA timezone', async () => {
    mockSignedInUser({ id: 'user-1' });
    mockRpc.mockResolvedValue({ data: { id: 'couple-1' }, error: null });

    const expectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    await createCouple();

    expect(mockRpc).toHaveBeenCalledWith('create_couple', { p_timezone: expectedTz });
  });

  it('throws on RPC error', async () => {
    mockSignedInUser({ id: 'user-1' });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(createCouple()).rejects.toEqual({ message: 'DB error' });
  });
});

describe('joinCouple', () => {
  it('throws if not authenticated', async () => {
    mockSignedInUser(null);
    await expect(joinCouple('ABC123')).rejects.toThrow('Not authenticated');
  });

  it('spends the code through the RPC and returns the couple', async () => {
    mockSignedInUser({ id: 'user-2' });
    const couple = { id: 'couple-1', partner_a_id: 'user-1', partner_b_id: 'user-2' };
    mockRpc.mockResolvedValue({ data: couple, error: null });

    const result = await joinCouple('ABC123');

    expect(result).toEqual(couple);
    expect(mockRpc).toHaveBeenCalledWith('join_couple', { p_code: 'ABC123' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // join.tsx alerts e.message, so the database's wording is the user's copy.
  it('surfaces the RPC message on a bad code', async () => {
    mockSignedInUser({ id: 'user-2' });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "That code didn't work. Check it with your partner and try again." },
    });

    await expect(joinCouple('BADCOD')).rejects.toThrow(
      "That code didn't work. Check it with your partner and try again."
    );
  });

  it('surfaces the RPC message when joining your own invite', async () => {
    mockSignedInUser({ id: 'user-1' });
    mockRpc.mockResolvedValue({ data: null, error: { message: "You can't join your own invite" } });

    await expect(joinCouple('ABC123')).rejects.toThrow("You can't join your own invite");
  });
});

describe('regenerateInviteCode', () => {
  it('takes no couple id: the RPC derives it from the caller', async () => {
    const renewed = { id: 'couple-1', invite_code: 'XYZ789' };
    mockRpc.mockResolvedValue({ data: renewed, error: null });

    const result = await regenerateInviteCode();

    expect(result).toEqual(renewed);
    expect(mockRpc).toHaveBeenCalledWith('regenerate_invite_code');
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'No invite to refresh' } });

    await expect(regenerateInviteCode()).rejects.toEqual({ message: 'No invite to refresh' });
  });
});

describe('getUserCouple', () => {
  it('returns null if not authenticated', async () => {
    mockSignedInUser(null);
    const result = await getUserCouple();
    expect(result).toBeNull();
  });

  it('returns null if user has no couple_id', async () => {
    mockSignedInUser({ id: 'user-1' });
    const selectChain = chainMock({ data: { couple_id: null } });
    mockFrom.mockReturnValue(selectChain);

    const result = await getUserCouple();
    expect(result).toBeNull();
  });

  it('returns the couple record when paired', async () => {
    mockSignedInUser({ id: 'user-1' });

    const couple = { id: 'couple-1', paired_at: '2026-05-25T00:00:00Z' };
    const userChain = chainMock({ data: { couple_id: 'couple-1' } });
    const coupleChain = chainMock({ data: couple });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? userChain : coupleChain;
    });

    const result = await getUserCouple();
    expect(result).toEqual(couple);
  });
});
