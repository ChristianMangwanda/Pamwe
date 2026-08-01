jest.mock('../lib/plans', () => ({ getPlanDay: jest.fn() }));
jest.mock('../lib/entries', () => ({ getMyEntry: jest.fn(), getPartnerEntry: jest.fn() }));
jest.mock('../providers/CoupleProvider', () => ({ useCouple: jest.fn() }));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTodayEntry } from '../hooks/useTodayEntry';
import { useCouple } from '../providers/CoupleProvider';
import { getPlanDay } from '../lib/plans';
import { getMyEntry, getPartnerEntry } from '../lib/entries';

const mockUseCouple = useCouple as unknown as jest.Mock;

function couplePlanOnDay(current_day: number) {
  mockUseCouple.mockReturnValue({
    couplePlan: { id: 'cp1', plan_id: 'p1', plan: { id: 'p1' }, current_day },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getPlanDay as jest.Mock).mockResolvedValue({ day_number: 1 });
  (getMyEntry as jest.Mock).mockResolvedValue(null);
  (getPartnerEntry as jest.Mock).mockResolvedValue(null);
});

describe('useTodayEntry day selection', () => {
  it('follows the couple current_day when unpinned', async () => {
    couplePlanOnDay(3);
    const { result } = renderHook(() => useTodayEntry());

    await waitFor(() => expect(result.current.dayNumber).toBe(3));
    expect(getPartnerEntry).toHaveBeenCalledWith('cp1', 3);
  });

  // The reveal pins its day. current_day advances the moment a partner taps
  // Amen and realtime delivers that to both phones, so an unpinned reveal would
  // jump to the next, empty day mid-read and blank out the reflections.
  it('stays on the pinned day even when current_day has moved past it', async () => {
    couplePlanOnDay(3);
    const { result } = renderHook(() => useTodayEntry(2));

    await waitFor(() => expect(result.current.dayNumber).toBe(2));
    expect(getPartnerEntry).toHaveBeenCalledWith('cp1', 2);
    expect(getPartnerEntry).not.toHaveBeenCalledWith('cp1', 3);
  });

  it('does not refetch a pinned day when current_day changes underneath it', async () => {
    couplePlanOnDay(2);
    const { result, rerender } = renderHook(() => useTodayEntry(2));
    await waitFor(() => expect(result.current.dayNumber).toBe(2));

    // The other partner taps Amen: current_day becomes 3 and lands here.
    couplePlanOnDay(3);
    rerender({});

    await waitFor(() => expect(result.current.dayNumber).toBe(2));
    expect(getPartnerEntry).not.toHaveBeenCalledWith('cp1', 3);
  });

  // CoupleProvider returns a fresh couplePlan object on every refresh, and it
  // refreshes on any couples or couple_plans change. Keyed on the object rather
  // than its ids, an unrelated write (a streak recompute, the anniversary) re-ran
  // all three queries on every screen using this hook at once.
  it('does not refetch when couplePlan identity changes but its ids and day do not', async () => {
    couplePlanOnDay(3);
    const { result, rerender } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.dayNumber).toBe(3));
    const before = (getPartnerEntry as jest.Mock).mock.calls.length;

    // A new object carrying the same ids and the same day, as a streak write
    // would produce.
    couplePlanOnDay(3);
    rerender({});
    await act(() => Promise.resolve());

    expect((getPartnerEntry as jest.Mock).mock.calls.length).toBe(before);
  });
});
