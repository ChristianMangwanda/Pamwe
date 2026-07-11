// Pure catch-up math for the Today screen. The server still owns day
// advancement and streaks; this only computes what to gently surface.

// Today's date (YYYY-MM-DD) in a given IANA timezone. Falls back to the local
// date if the timezone is unknown.
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }
}

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

// The plan day the couple "should" be on today: day 1 on the start date, then
// one per calendar day, capped at the plan length. Never below 1.
export function expectedDay(startDate: string, todayISO: string, totalDays: number): number {
  const raw = daysBetween(startDate, todayISO) + 1;
  return Math.max(1, Math.min(raw, totalDays));
}

// How many days behind the expected pace the couple is. 0 when on or ahead of
// pace (finishing early is not "behind").
export function daysBehind(
  startDate: string, currentDay: number, todayISO: string, totalDays: number,
): number {
  return Math.max(0, expectedDay(startDate, todayISO, totalDays) - currentDay);
}
