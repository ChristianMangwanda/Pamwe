jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { isFinished } from '../lib/planHistory';

// This predicate decides whether the tree grows and whether a badge is handed
// out, so it has to mean "you read the whole thing", not "this row is retired".
// enrollInPlan marks the outgoing plan 'completed' on every switch, so status
// says nothing about whether a plan was finished or walked away from.
describe('isFinished', () => {
  const plan = (durationDays: number | null) => ({ duration_days: durationDays });

  it('counts a plan read to its last day', () => {
    expect(isFinished({ current_day: 14, plan: plan(14) })).toBe(true);
  });

  it('does not count a plan abandoned on day one', () => {
    // The real shape that prompted this: two 21-day plans retired at day 1 with
    // no entries, sitting alongside one genuinely finished 14-day plan.
    expect(isFinished({ current_day: 1, plan: plan(21) })).toBe(false);
  });

  it('does not count a plan abandoned near the end', () => {
    expect(isFinished({ current_day: 13, plan: plan(14) })).toBe(false);
  });

  it('counts a plan whose day ran past its length', () => {
    expect(isFinished({ current_day: 15, plan: plan(14) })).toBe(true);
  });

  it('refuses to count a plan with no known length', () => {
    // Guards the divide-by-nothing case: a missing duration must never read as
    // finished, or every retired row would count.
    expect(isFinished({ current_day: 99, plan: plan(null) })).toBe(false);
    expect(isFinished({ current_day: 99, plan: plan(0) })).toBe(false);
    expect(isFinished({ current_day: 99, plan: null })).toBe(false);
  });

  it('treats a missing current_day as not finished', () => {
    expect(isFinished({ current_day: null, plan: plan(14) })).toBe(false);
    expect(isFinished({ plan: plan(14) })).toBe(false);
  });
});
