import { togetherSince, daysTogether } from '../lib/couples';

// Pure date arithmetic, but it lives in couples.ts next to the RPC that writes
// the anniversary, and that module builds a real client at import time.
jest.mock('../lib/supabase', () => ({ supabase: { auth: {}, from: jest.fn(), rpc: jest.fn() } }));

// One rule feeds the You tab's "Days together" stat and the Lock Screen
// widget's counter. If they drift apart the app contradicts itself on the
// user's home screen, so the arithmetic is pinned here.

describe('togetherSince', () => {
  it('has no date for a couple that does not exist yet', () => {
    expect(togetherSince(null)).toBeNull();
    expect(togetherSince({})).toBeNull();
  });

  it('falls back to the pairing date until an anniversary is set', () => {
    const since = togetherSince({ paired_at: '2026-07-11T09:30:00Z' });
    expect(since?.getFullYear()).toBe(2026);
  });

  it('prefers the couple\'s own anniversary over the pairing date', () => {
    const since = togetherSince({ anniversary: '2022-05-14', paired_at: '2026-07-11T09:30:00Z' });
    expect(since?.getFullYear()).toBe(2022);
    expect(since?.getMonth()).toBe(4);
    expect(since?.getDate()).toBe(14);
  });

  it('reads the date column as a local calendar day, not UTC midnight', () => {
    // new Date('2022-05-14') is UTC midnight, which is 13 May anywhere west of
    // Greenwich and would drop a day from the count.
    const since = togetherSince({ anniversary: '2022-05-14' });
    expect(since?.getDate()).toBe(14);
    expect(since?.getHours()).toBe(0);
  });
});

describe('daysTogether', () => {
  const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

  it('counts the first day as one', () => {
    expect(daysTogether({ anniversary: '2026-07-31' }, on(2026, 7, 31))).toBe(1);
  });

  it('counts whole days since the anniversary', () => {
    expect(daysTogether({ anniversary: '2026-07-01' }, on(2026, 7, 31))).toBe(31);
    expect(daysTogether({ anniversary: '2022-05-14' }, on(2026, 7, 31))).toBe(1540);
  });

  it('ignores the time of day on either end', () => {
    const early = daysTogether({ anniversary: '2026-07-01' }, new Date(2026, 6, 31, 0, 5));
    const late = daysTogether({ anniversary: '2026-07-01' }, new Date(2026, 6, 31, 23, 55));
    expect(early).toBe(late);
  });

  it('is zero when there is nothing to count from', () => {
    expect(daysTogether(null)).toBe(0);
    expect(daysTogether({})).toBe(0);
  });

  it('never goes negative', () => {
    expect(daysTogether({ anniversary: '2027-01-01' }, on(2026, 7, 31))).toBe(0);
  });
});
