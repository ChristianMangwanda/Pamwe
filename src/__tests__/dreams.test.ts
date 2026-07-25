import { getDreams, createDream, updateDream, deleteDream } from '../lib/dreams';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

// dreams.ts reads the signed-in user from the local session (getSession), the
// same rule the rest of src/lib follows: getUser() hangs after a fresh sign-in.
function mockSignedInUser(user: { id: string } | null) {
  mockGetSession.mockResolvedValue({ data: { session: user ? { user } : null } });
}

// The list/delete calls resolve at the end of the chain rather than at
// .single(), so the chain itself is thenable.
function chainMock(overrides: Record<string, any> = {}) {
  const result = { data: overrides.data ?? null, error: overrides.error ?? null };
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDreams', () => {
  it('reads one couple newest first', async () => {
    const rows = [{ id: 'dream-1', text: 'A river I could not cross' }];
    const chain = chainMock({ data: rows });
    mockFrom.mockReturnValue(chain);

    await expect(getDreams('couple-1')).resolves.toEqual(rows);

    expect(mockFrom).toHaveBeenCalledWith('dreams');
    expect(chain.eq).toHaveBeenCalledWith('couple_id', 'couple-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns an empty list rather than null when the couple has none', async () => {
    mockFrom.mockReturnValue(chainMock({ data: null }));
    await expect(getDreams('couple-1')).resolves.toEqual([]);
  });

  it('throws the query error instead of swallowing it', async () => {
    mockFrom.mockReturnValue(chainMock({ error: new Error('boom') }));
    await expect(getDreams('couple-1')).rejects.toThrow('boom');
  });
});

describe('createDream', () => {
  it('throws if not authenticated', async () => {
    mockSignedInUser(null);
    await expect(createDream('couple-1', 'a dream')).rejects.toThrow('Not authenticated');
  });

  it('stamps the author from the session and trims the text', async () => {
    mockSignedInUser({ id: 'user-1' });
    const chain = chainMock({ data: { id: 'dream-1' } });
    mockFrom.mockReturnValue(chain);

    await createDream('couple-1', '  standing at the edge of a river  ');

    expect(mockFrom).toHaveBeenCalledWith('dreams');
    expect(chain.insert).toHaveBeenCalledWith({
      couple_id: 'couple-1',
      author_id: 'user-1',
      text: 'standing at the edge of a river',
    });
  });
});

describe('updateDream', () => {
  it('updates only the addressed dream', async () => {
    const chain = chainMock({ data: { id: 'dream-1' } });
    mockFrom.mockReturnValue(chain);

    await updateDream('dream-1', '  reworded  ');

    expect(chain.update).toHaveBeenCalledWith({ text: 'reworded' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'dream-1');
  });
});

describe('deleteDream', () => {
  it('deletes by id', async () => {
    const chain = chainMock();
    mockFrom.mockReturnValue(chain);

    await deleteDream('dream-1');

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'dream-1');
  });

  it('throws when the delete is rejected', async () => {
    mockFrom.mockReturnValue(chainMock({ error: new Error('denied') }));
    await expect(deleteDream('dream-1')).rejects.toThrow('denied');
  });
});
