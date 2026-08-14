import { expectedDay, daysBehind, todayInTimezone, owedDays } from '../lib/catchup';

describe('catch-up math', () => {
  it('expects day 1 on the start date', () => {
    expect(expectedDay('2026-07-01', '2026-07-01', 21)).toBe(1);
  });

  it('advances one expected day per calendar day', () => {
    expect(expectedDay('2026-07-01', '2026-07-05', 21)).toBe(5);
  });

  it('caps the expected day at the plan length', () => {
    expect(expectedDay('2026-07-01', '2026-09-01', 21)).toBe(21);
  });

  it('is behind when current_day trails the expected pace', () => {
    expect(daysBehind('2026-07-01', 3, '2026-07-06', 21)).toBe(3);
  });

  it('is not behind when on pace', () => {
    expect(daysBehind('2026-07-01', 6, '2026-07-06', 21)).toBe(0);
  });

  it('is not behind when ahead of pace (finishing early)', () => {
    expect(daysBehind('2026-07-01', 10, '2026-07-06', 21)).toBe(0);
  });
});

// A couple reading every other day, or weekly, is keeping their own rhythm and
// must never be told they're behind for it.
describe('catch-up math honours the cadence', () => {
  it('expects a new day only once per cadence window', () => {
    // Every other day: 4 days in is day 3 (start, +2, +4), not day 5.
    expect(expectedDay('2026-07-01', '2026-07-05', 21, 2)).toBe(3);
    // Weekly: 14 days in is day 3.
    expect(expectedDay('2026-07-01', '2026-07-15', 21, 7)).toBe(3);
  });

  it('holds the expected day mid-window', () => {
    // On an every-other-day rhythm, the day after a reading is still that day.
    expect(expectedDay('2026-07-01', '2026-07-02', 21, 2)).toBe(1);
    expect(expectedDay('2026-07-01', '2026-07-03', 21, 2)).toBe(2);
  });

  it('does not call a slower rhythm behind', () => {
    // 6 days in on day 4: dead on pace for every other day, but 3 days behind
    // if we still assumed daily.
    expect(daysBehind('2026-07-01', 4, '2026-07-07', 21, 2)).toBe(0);
    expect(daysBehind('2026-07-01', 4, '2026-07-07', 21)).toBe(3);
  });

  it('still reports a genuinely behind couple on their own rhythm', () => {
    // Weekly, 21 days in: they should be on day 4 and are on day 2.
    expect(daysBehind('2026-07-01', 2, '2026-07-22', 21, 7)).toBe(2);
  });

  it('defaults to daily when no cadence is given', () => {
    expect(expectedDay('2026-07-01', '2026-07-05', 21)).toBe(expectedDay('2026-07-01', '2026-07-05', 21, 1));
  });

  it('caps at the plan length on any cadence', () => {
    expect(expectedDay('2026-07-01', '2027-07-01', 21, 7)).toBe(21);
  });

  it('formats today as an ISO date for a timezone', () => {
    const iso = todayInTimezone('America/New_York', new Date('2026-07-10T12:00:00Z'));
    expect(iso).toBe('2026-07-10');
  });
});

// Falling behind was a dead end before this: Today renders current_day and
// nothing else, so the days between it and today were open but unreachable.
describe('the days a couple still owes', () => {
  it('lists every open day from where they are up to today', () => {
    // On day 2, should be on day 4: days 2 and 3 were missed, day 4 is today's.
    expect(owedDays(2, '2026-08-10', '2026-08-13', 21)).toEqual([2, 3, 4]);
  });

  it('runs one longer than daysBehind, because today is owed too', () => {
    const behind = daysBehind('2026-08-10', 2, '2026-08-13', 21);
    expect(owedDays(2, '2026-08-10', '2026-08-13', 21)).toHaveLength(behind + 1);
  });

  it('is just today when the couple is on pace', () => {
    expect(owedDays(4, '2026-08-10', '2026-08-13', 21)).toEqual([4]);
  });

  it('never offers a day the gate has not opened', () => {
    // Ahead of pace. Reading tomorrow's tonight is the one thing the gate
    // exists to stop, and catch-up must not be a way around it.
    expect(owedDays(9, '2026-08-10', '2026-08-13', 21)).toEqual([]);
  });

  it('never runs past the end of the plan', () => {
    // A month away from a 21 day plan owes 21 days, not 30.
    expect(owedDays(19, '2026-07-10', '2026-08-13', 21)).toEqual([19, 20, 21]);
  });

  it('honours a slower rhythm rather than calling it a backlog', () => {
    // Every other day, 6 days in, on day 4: dead on pace, so only today's.
    expect(owedDays(4, '2026-07-01', '2026-07-07', 21, 2)).toEqual([4]);
  });

  it('stays empty without a start date rather than inventing a backlog', () => {
    expect(owedDays(3, null, '2026-08-13', 21)).toEqual([]);
  });
});
