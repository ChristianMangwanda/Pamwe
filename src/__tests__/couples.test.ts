import { createCouple, joinCouple, getUserCouple } from '../lib/couples';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

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

describe('createCouple', () => {
  it('throws if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(createCouple()).rejects.toThrow('Not authenticated');
  });

  it('creates a couple with a 6-char invite code and 7-day expiry', async () => {
    const fakeUser = { id: 'user-1' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const coupleData = {
      id: 'couple-1',
      invite_code: 'ABC123',
      partner_a_id: 'user-1',
    };

    const insertChain = chainMock({ data: coupleData });
    const updateChain = chainMock({ data: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'couples') return insertChain;
      if (table === 'users') return updateChain;
      return chainMock();
    });

    const result = await createCouple();

    expect(result).toEqual(coupleData);
    expect(mockFrom).toHaveBeenCalledWith('couples');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        partner_a_id: 'user-1',
        invite_code: expect.any(String),
        invite_expires_at: expect.any(String),
      })
    );
    // Verify invite code is 6 characters
    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall.invite_code).toHaveLength(6);
    // Verify expiry is ~7 days from now
    const expiry = new Date(insertCall.invite_expires_at);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it('updates the user record with couple_id after creation', async () => {
    const fakeUser = { id: 'user-1' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const coupleData = { id: 'couple-1', invite_code: 'XYZ789' };
    const insertChain = chainMock({ data: coupleData });
    const updateChain = chainMock({ data: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'couples') return insertChain;
      if (table === 'users') return updateChain;
      return chainMock();
    });

    await createCouple();

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(updateChain.update).toHaveBeenCalledWith({ couple_id: 'couple-1' });
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('throws on supabase insert error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertChain = chainMock({ error: { message: 'DB error' } });
    mockFrom.mockReturnValue(insertChain);

    await expect(createCouple()).rejects.toEqual({ message: 'DB error' });
  });

  it('captures the device IANA timezone in the insert payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertChain = chainMock({ data: { id: 'couple-1' } });
    const updateChain = chainMock({ data: null });
    mockFrom.mockImplementation((table: string) =>
      table === 'couples' ? insertChain : updateChain
    );

    const expectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    await createCouple();

    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall.timezone).toBe(expectedTz);
    expect(typeof insertCall.timezone).toBe('string');
    expect(insertCall.timezone.length).toBeGreaterThan(0);
  });
});

describe('joinCouple', () => {
  it('throws if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(joinCouple('ABC123')).rejects.toThrow('Not authenticated');
  });

  it('throws on invalid/expired code', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });
    const selectChain = chainMock({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(selectChain);

    await expect(joinCouple('BADCODE')).rejects.toThrow('Invalid or expired invite code');
  });

  it('throws if trying to join own invite', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const selectChain = chainMock({ data: { id: 'couple-1', partner_a_id: 'user-1' } });
    mockFrom.mockReturnValue(selectChain);

    await expect(joinCouple('ABC123')).rejects.toThrow("You can't join your own invite");
  });

  it('uppercases the invite code before lookup', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });
    const selectChain = chainMock({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(selectChain);

    try { await joinCouple('abc123'); } catch {}

    expect(selectChain.eq).toHaveBeenCalledWith('invite_code', 'ABC123');
  });

  it('sets partner_b_id and paired_at on successful join', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });

    const couple = { id: 'couple-1', partner_a_id: 'user-1' };
    const selectChain = chainMock({ data: couple });
    const updateChain = chainMock({ data: null });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'couples') {
        callCount++;
        return callCount === 1 ? selectChain : updateChain;
      }
      if (table === 'users') return updateChain;
      return chainMock();
    });

    await joinCouple('ABC123');

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        partner_b_id: 'user-2',
        paired_at: expect.any(String),
      })
    );
  });
});

describe('getUserCouple', () => {
  it('returns null if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getUserCouple();
    expect(result).toBeNull();
  });

  it('returns null if user has no couple_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const selectChain = chainMock({ data: { couple_id: null } });
    mockFrom.mockReturnValue(selectChain);

    const result = await getUserCouple();
    expect(result).toBeNull();
  });

  it('returns the couple record when paired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

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
