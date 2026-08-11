jest.mock('../lib/plans', () => ({ getPlanDay: jest.fn() }));
jest.mock('../lib/entries', () => ({ getMyEntry: jest.fn(), getPartnerEntry: jest.fn() }));
jest.mock('../providers/CoupleProvider', () => ({ useCouple: jest.fn() }));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTodayEntry } from '../hooks/useTodayEntry';
import { useCouple } from '../providers/CoupleProvider';
import { getPlanDay } from '../lib/plans';
import { getMyEntry, getPartnerEntry } from '../lib/entries';

const mockUseCouple = useCouple as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCouple.mockReturnValue({
    couplePlan: { id: 'cp1', plan_id: 'p1', plan: { id: 'p1' }, current_day: 3 },
  });
  (getPlanDay as jest.Mock).mockResolvedValue({ day_number: 3, passage_reference: 'John 1' });
  (getMyEntry as jest.Mock).mockResolvedValue(null);
  (getPartnerEntry as jest.Mock).mockResolvedValue(null);
});

// Today read `planDay` and nothing else, so a failed fetch rendered the same
// "you don't have an active reading plan" copy a brand new couple sees. Empty,
// offline and broken are three different things and must never share a
// sentence. The hook's job here is to say WHICH one happened.
describe('useTodayEntry error taxonomy', () => {
  it('reports nothing wrong on a clean load', async () => {
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.planDay).toBeTruthy());
    expect(result.current.error).toBeNull();
  });

  it('calls a dropped connection a network error', async () => {
    (getPlanDay as jest.Mock).mockRejectedValue(new Error('Network request failed'));
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.error).toBe('network'));
  });

  it('calls a plan day that genuinely does not exist missing-day', async () => {
    // PGRST116 is PostgREST's "no rows" for .single(). Retrying cannot fix it,
    // so it gets its own words and its own way out.
    (getPlanDay as jest.Mock).mockRejectedValue({ code: 'PGRST116', message: 'no rows' });
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.error).toBe('missing-day'));
  });

  it('keeps the last good day on screen when a later refresh fails', async () => {
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.planDay).toBeTruthy());

    (getPlanDay as jest.Mock).mockRejectedValue(new Error('offline'));
    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.error).toBe('network'));
    // The verse a couple was reading should not disappear because the refresh
    // behind it blipped.
    expect(result.current.planDay).toEqual({ day_number: 3, passage_reference: 'John 1' });
  });

  it('clears the error once a retry succeeds', async () => {
    (getPlanDay as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.error).toBe('network'));

    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('reports a failure from either entry read, not just the plan day', async () => {
    (getPartnerEntry as jest.Mock).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTodayEntry());
    await waitFor(() => expect(result.current.error).toBe('network'));
  });
});
