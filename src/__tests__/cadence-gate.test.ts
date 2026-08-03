import { canOpenDay, opensOn, opensLabel, expectedDay } from '../lib/catchup';

// The gate that stops a couple reading tomorrow's day tonight.
//
// It is DIRECTIONAL and that is the whole design: behind your rhythm you may
// open several days at once, because that is catching up and it is credited
// (2026-07-26, after 9 days read across 15 showed a streak of 1). Ahead of it,
// nothing opens. These tests exist mostly to keep those two from being
// collapsed into one rule by someone simplifying later.

const START = '2026-01-01';
const YEAR = 365;

describe('canOpenDay, behind the rhythm', () => {
  it('opens every day up to today, so catching up still works', () => {
    // Ten days in, still on day 3: days 3 through 10 are all fair game.
    for (const day of [3, 4, 7, 10]) {
      expect(canOpenDay(day, START, '2026-01-10', YEAR)).toBe(true);
    }
  });

  it('still refuses the day after today, however far behind you are', () => {
    expect(canOpenDay(11, START, '2026-01-10', YEAR)).toBe(false);
  });
});

describe('canOpenDay, on and ahead of the rhythm', () => {
  it('opens the day the rhythm expects', () => {
    expect(canOpenDay(5, START, '2026-01-05', YEAR)).toBe(true);
  });

  it('closes the next one until its date comes', () => {
    expect(canOpenDay(6, START, '2026-01-05', YEAR)).toBe(false);
    expect(canOpenDay(6, START, '2026-01-06', YEAR)).toBe(true);
  });

  it('closes day 2 on the day a couple starts', () => {
    // The first evening is the one that sets the habit, so it matters most.
    expect(canOpenDay(1, START, START, YEAR)).toBe(true);
    expect(canOpenDay(2, START, START, YEAR)).toBe(false);
  });
});

describe('canOpenDay honours the chosen cadence', () => {
  it('gives a weekly couple their next day next week, not tonight', () => {
    expect(canOpenDay(2, START, '2026-01-01', YEAR, 7)).toBe(false);
    expect(canOpenDay(2, START, '2026-01-07', YEAR, 7)).toBe(false);
    expect(canOpenDay(2, START, '2026-01-08', YEAR, 7)).toBe(true);
  });

  it('never reports a slower rhythm as being early', () => {
    // Every-other-day: day 2 opens on the third calendar day.
    expect(canOpenDay(2, START, '2026-01-03', YEAR, 2)).toBe(true);
  });
});

describe('canOpenDay fails open', () => {
  it('never locks a couple out for a missing start date', () => {
    for (const missing of [null, undefined, '']) {
      expect(canOpenDay(99, missing, '2026-01-01', YEAR)).toBe(true);
    }
  });
});

describe('opensOn', () => {
  it('inverts expectedDay exactly, at every cadence', () => {
    // The gate and the "opens tomorrow" line must read off one rule, or a
    // couple gets told to come back on a day that is still locked.
    for (const cadence of [1, 2, 7]) {
      for (const day of [1, 2, 3, 8, 40]) {
        const iso = opensOn(START, day, cadence);
        expect(expectedDay(START, iso, YEAR, cadence)).toBeGreaterThanOrEqual(day);
        expect(canOpenDay(day, START, iso, YEAR, cadence)).toBe(true);
      }
    }
  });

  it('leaves the day before still shut', () => {
    for (const cadence of [1, 2, 7]) {
      const iso = opensOn(START, 5, cadence);
      const before = new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      expect(canOpenDay(5, START, before, YEAR, cadence)).toBe(false);
    }
  });
});

describe('opensLabel', () => {
  it('reads as a morning, a weekday, or a date, by how far off it is', () => {
    expect(opensLabel('2026-01-06', '2026-01-05')).toBe('tomorrow morning');
    expect(opensLabel('2026-01-08', '2026-01-05')).toBe('on Thursday');
    expect(opensLabel('2026-02-01', '2026-01-05')).toBe('on February 1');
  });

  it('says now rather than counting backwards', () => {
    expect(opensLabel('2026-01-05', '2026-01-05')).toBe('now');
    expect(opensLabel('2026-01-01', '2026-01-05')).toBe('now');
  });

  it('has no em dash', () => {
    for (const s of [opensLabel('2026-01-06', '2026-01-05'), opensLabel('2026-02-01', '2026-01-05')]) {
      expect(s).not.toContain('—');
    }
  });
});
