import { expectedDay, daysBehind, todayInTimezone } from '../lib/catchup';

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

  it('formats today as an ISO date for a timezone', () => {
    const iso = todayInTimezone('America/New_York', new Date('2026-07-10T12:00:00Z'));
    expect(iso).toBe('2026-07-10');
  });
});
