jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

import { enrollInPlan, switchPlan } from '../lib/plans';
import { supabase } from '../lib/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

const ACTIVE = { id: 'cp-new', plan_id: 'plan-2', status: 'active', plan: { id: 'plan-2' } };

/** getActiveCouPlan's chain: select -> eq -> eq -> order -> limit -> maybeSingle. */
function activePlanChain(data: any, error: any = null) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve({ data, error })),
  };
  return chain;
}

beforeEach(() => jest.clearAllMocks());

// Enrolling used to be an UPDATE retiring the old plan followed by a separate
// INSERT. A failure between the two left the couple with NO active plan, the
// gate bounced them to plan-select, and nothing in the app could put the old
// one back. Worse, a plan retired before its last day also fails isFinished(),
// so it disappeared from the completed list too: the plan they were in the
// middle of was simply gone from both.
describe('enrollInPlan', () => {
  it('switches inside one database call', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce(activePlanChain(ACTIVE));

    await expect(enrollInPlan('couple-1', 'plan-2', 2)).resolves.toEqual(ACTIVE);
    expect(mockRpc).toHaveBeenCalledWith('switch_plan', {
      p_couple: 'couple-1',
      p_plan: 'plan-2',
      p_cadence: 2,
    });
    // Exactly one read afterwards, for the joined shape callers expect. No
    // client-side update or insert is left.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('defaults to the daily rhythm', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce(activePlanChain(ACTIVE));

    await enrollInPlan('couple-1', 'plan-2');
    expect(mockRpc).toHaveBeenCalledWith(
      'switch_plan',
      expect.objectContaining({ p_cadence: 1 }),
    );
  });

  it('surfaces a failed switch instead of leaving the couple planless', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'network' } });
    await expect(enrollInPlan('couple-1', 'plan-2')).rejects.toBeTruthy();
    // The old plan is untouched: the function never committed.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('refuses to report success when no active plan comes back', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce(activePlanChain(null));
    await expect(enrollInPlan('couple-1', 'plan-2')).rejects.toThrow(/Couldn't start that plan/);
  });

  it('switchPlan is the same call under a name that reads better', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce(activePlanChain(ACTIVE));

    await switchPlan('couple-1', 'plan-2', 7);
    expect(mockRpc).toHaveBeenCalledWith(
      'switch_plan',
      expect.objectContaining({ p_couple: 'couple-1', p_plan: 'plan-2', p_cadence: 7 }),
    );
  });
});
