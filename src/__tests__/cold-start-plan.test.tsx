jest.mock('../lib/plans', () => ({ getPlanDay: jest.fn() }));
jest.mock('../lib/entries', () => ({ getMyEntry: jest.fn(), getPartnerEntry: jest.fn() }));
jest.mock('../providers/CoupleProvider', () => ({ useCouple: jest.fn() }));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useTodayEntry } from '../hooks/useTodayEntry';
import { useCouple } from '../providers/CoupleProvider';
import { getPlanDay } from '../lib/plans';
import { getMyEntry, getPartnerEntry } from '../lib/entries';

const mockUseCouple = useCouple as unknown as jest.Mock;

const PLAN = { id: 'cp1', plan_id: 'p1', plan: { id: 'p1' }, current_day: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  (getPlanDay as jest.Mock).mockResolvedValue({ day_number: 3, passage_reference: 'John 1' });
  (getMyEntry as jest.Mock).mockResolvedValue(null);
  (getPartnerEntry as jest.Mock).mockResolvedValue(null);
});

// A null couplePlan means one of two entirely different things, and the hook
// used to report both as "done, nothing here". On every cold launch that put
// "You don't have an active reading plan right now" in front of couples who
// were months into one, for as long as the couple fetch took, and permanently
// when it failed. Waiting and empty must never share an answer.
describe('useTodayEntry during a cold start', () => {
  it('stays loading while CoupleProvider has not answered yet', async () => {
    mockUseCouple.mockReturnValue({ couplePlan: null, loading: true });
    const { result } = renderHook(() => useTodayEntry());

    // The important assertion is the one that does NOT settle: nothing may
    // conclude "no plan" while the provider is still in flight.
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.planDay).toBeNull();
  });

  it('reports no plan only once the provider has actually answered', async () => {
    mockUseCouple.mockReturnValue({ couplePlan: null, loading: true });
    const { result, rerender } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.loading).toBe(true));

    // The provider settles, and there genuinely is no plan. Now, and only now,
    // the empty state is the truth.
    mockUseCouple.mockReturnValue({ couplePlan: null, loading: false });
    rerender({});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.planDay).toBeNull();
  });

  it('loads the day when the provider answers with a plan', async () => {
    mockUseCouple.mockReturnValue({ couplePlan: null, loading: true });
    const { result, rerender } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.loading).toBe(true));
    // Nothing was fetched while there was no plan to fetch for.
    expect(getPlanDay).not.toHaveBeenCalled();

    mockUseCouple.mockReturnValue({ couplePlan: PLAN, loading: false });
    rerender({});

    await waitFor(() => expect(result.current.planDay).toBeTruthy());
    expect(result.current.loading).toBe(false);
    expect(result.current.dayNumber).toBe(3);
  });

  it('does not strand the spinner when the provider settles empty', async () => {
    // The loading flag is held by the provider's own flag, so the callback that
    // holds it has to change identity when that flag falls, or the spinner it
    // raised would never come down.
    mockUseCouple.mockReturnValue({ couplePlan: null, loading: true });
    const { result, rerender } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.loading).toBe(true));

    mockUseCouple.mockReturnValue({ couplePlan: null, loading: false });
    rerender({});

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
