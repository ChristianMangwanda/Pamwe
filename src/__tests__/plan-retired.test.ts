jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { retiredPlans } from '../lib/planHistory';
import { supabase } from '../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

const ME = 'user-me';
const THEM = 'user-them';

function couplePlansChain(rows: any[]) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn((col: string) => (col === 'status'
      ? Promise.resolve({ data: rows, error: null })
      : chain)),
  };
  return chain;
}

function entriesChain(rows: any[]) {
  const chain: any = {
    select: jest.fn(() => chain),
    in: jest.fn(() => chain),
    not: jest.fn(() => Promise.resolve({ data: rows, error: null })),
  };
  return chain;
}

const cp = (id: string, currentDay: number, duration: number, createdAt = '2026-01-01') => ({
  id,
  plan_id: `plan-${id}`,
  current_day: currentDay,
  cadence_days: 1,
  created_at: createdAt,
  plan: { title: `Plan ${id}`, duration_days: duration },
});

const sealed = (cpId: string, day: number, userId: string, at: string) => ({
  couple_plan_id: cpId,
  day_number: day,
  user_id: userId,
  submitted_at: at,
});

beforeEach(() => jest.clearAllMocks());

// A plan ended part way used to vanish from the whole app: isFinished() is
// false for it, so it fell out of the Plans tab, out of Today's finished state
// and out of the You tab, while its status said 'completed'. A couple who read
// eleven days of twenty-one had nothing showing those eleven days happened.
describe('retiredPlans', () => {
  it('lists an ended plan with the days both partners actually sealed', async () => {
    mockFrom
      .mockReturnValueOnce(couplePlansChain([cp('a', 4, 21)]))
      .mockReturnValueOnce(entriesChain([
        sealed('a', 1, ME, '2026-03-01'), sealed('a', 1, THEM, '2026-03-01'),
        sealed('a', 2, ME, '2026-03-02'), sealed('a', 2, THEM, '2026-03-02'),
        sealed('a', 3, ME, '2026-03-03'), sealed('a', 3, THEM, '2026-03-03'),
      ]));

    const [plan] = await retiredPlans('couple-1');
    expect(plan.finished).toBe(false);
    expect(plan.daysRead).toBe(3);
    expect(plan.durationDays).toBe(21);
  });

  it('counts a day only one of them sealed as not read together', async () => {
    // The streak counts sealed days, and so does this: a day one partner wrote
    // into and the other never did is not a day they read together.
    mockFrom
      .mockReturnValueOnce(couplePlansChain([cp('a', 3, 21)]))
      .mockReturnValueOnce(entriesChain([
        sealed('a', 1, ME, '2026-03-01'), sealed('a', 1, THEM, '2026-03-01'),
        sealed('a', 2, ME, '2026-03-02'),
      ]));

    const [plan] = await retiredPlans('couple-1');
    expect(plan.daysRead).toBe(1);
  });

  it('marks a plan read to the last day as finished', async () => {
    mockFrom
      .mockReturnValueOnce(couplePlansChain([cp('a', 14, 14)]))
      .mockReturnValueOnce(entriesChain([
        sealed('a', 1, ME, '2026-03-01'), sealed('a', 1, THEM, '2026-03-01'),
      ]));

    const [plan] = await retiredPlans('couple-1');
    expect(plan.finished).toBe(true);
  });

  it('falls back to the day they reached when RLS hides every entry', async () => {
    // A partner's entry is invisible until you have both sealed the day, so a
    // plan whose days were never revealed reads as zero. Saying they read
    // nothing would be worse than approximating from current_day.
    mockFrom
      .mockReturnValueOnce(couplePlansChain([cp('a', 6, 21)]))
      .mockReturnValueOnce(entriesChain([]));

    const [plan] = await retiredPlans('couple-1');
    expect(plan.daysRead).toBe(5);
  });

  it('reports zero for a plan retired on day one, so it can be hidden', async () => {
    // Switching plans retires the outgoing one. An enrolment nobody read is an
    // abandonment, not history, and the finished screen filters these out.
    mockFrom
      .mockReturnValueOnce(couplePlansChain([cp('a', 1, 21)]))
      .mockReturnValueOnce(entriesChain([]));

    const [plan] = await retiredPlans('couple-1');
    expect(plan.daysRead).toBe(0);
    expect(plan.finished).toBe(false);
  });

  it('orders by when each plan actually ended, newest first', async () => {
    mockFrom
      .mockReturnValueOnce(couplePlansChain([
        cp('older', 5, 21, '2026-01-01'),
        cp('newer', 5, 21, '2026-01-02'),
      ]))
      .mockReturnValueOnce(entriesChain([
        sealed('older', 1, ME, '2026-06-01'), sealed('older', 1, THEM, '2026-06-01'),
        sealed('newer', 1, ME, '2026-02-01'), sealed('newer', 1, THEM, '2026-02-01'),
      ]));

    // 'older' was enrolled first but read most recently, and the last sealed
    // entry is when a plan really ended.
    const plans = await retiredPlans('couple-1');
    expect(plans.map((p) => p.couplePlanId)).toEqual(['older', 'newer']);
  });

  it('returns nothing when the couple has retired no plans', async () => {
    mockFrom.mockReturnValueOnce(couplePlansChain([]));
    await expect(retiredPlans('couple-1')).resolves.toEqual([]);
    // No second query: there is nothing to count entries for.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
