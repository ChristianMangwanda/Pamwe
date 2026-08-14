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
// one per `cadenceDays` calendar days, capped at the plan length. Never below 1.
// cadenceDays is the couple's chosen rhythm (1 daily, 2 every other day, 7
// weekly), so a slower rhythm expects fewer days by now and never reads as late.
export function expectedDay(
  startDate: string, todayISO: string, totalDays: number, cadenceDays = 1,
): number {
  const interval = Math.max(1, cadenceDays);
  const raw = Math.floor(daysBetween(startDate, todayISO) / interval) + 1;
  return Math.max(1, Math.min(raw, totalDays));
}

// How many plan days behind their own rhythm the couple is. 0 when on or ahead
// of pace (finishing early is not "behind").
export function daysBehind(
  startDate: string, currentDay: number, todayISO: string, totalDays: number, cadenceDays = 1,
): number {
  return Math.max(0, expectedDay(startDate, todayISO, totalDays, cadenceDays) - currentDay);
}

/**
 * Whether a plan day may be opened for the ritual yet.
 *
 * The rule is DIRECTIONAL, and that is the whole point. Behind your rhythm, you
 * may open several days in one sitting: that is catching up, and it has been
 * credited since 2026-07-26, when a couple who read 9 days across 15 saw a
 * streak of 1. Ahead of it, nothing opens: reading tomorrow's tonight turns a
 * daily ritual into a backlog to clear, which is the one thing this app is
 * built against.
 *
 * Measured against the couple's CHOSEN cadence, so a weekly couple gets day 2
 * next week rather than tonight, and is never told they are early for keeping
 * the rhythm they picked.
 *
 * Fails OPEN without a start date. A couple must never be locked out of their
 * own plan because a column is null.
 */
export function canOpenDay(
  day: number,
  startDate: string | null | undefined,
  todayISO: string,
  totalDays: number,
  cadenceDays = 1,
): boolean {
  if (!startDate) return true;
  return day <= expectedDay(startDate, todayISO, totalDays, cadenceDays);
}

/**
 * Every plan day that is open and still unread, oldest first.
 *
 * current_day is the pointer the ritual moves through, and it only ever
 * advances when a partner taps Amen on a reveal, so it IS the oldest day the
 * couple has not finished together. Everything from there up to expectedDay is
 * both open (the gate is directional: behind your rhythm, every day up to today
 * stays open) and unread. That range is the catch-up.
 *
 * The last entry is today's own reading rather than something missed, so the
 * list is one longer than `daysBehind`. Both are true and the screen says which
 * is which: a list that hid today's would leave a couple who cleared it still
 * looking at an empty screen and a plan they had not finished for the day.
 *
 * Empty without a start date, and empty when on pace. Never longer than the
 * plan: a couple who left a 21 day plan for a month owes 21 days, not 30.
 */
export function owedDays(
  currentDay: number,
  startDate: string | null | undefined,
  todayISO: string,
  totalDays: number,
  cadenceDays = 1,
): number[] {
  if (!startDate) return [];
  const last = expectedDay(startDate, todayISO, totalDays, cadenceDays);
  const days: number[] = [];
  for (let d = Math.max(1, currentDay); d <= last; d++) days.push(d);
  return days;
}

/**
 * The date a plan day becomes openable, as YYYY-MM-DD.
 *
 * expectedDay counts floor(elapsed / interval) + 1, so day N needs
 * (N - 1) * interval days elapsed. Inverting it here keeps the gate and the
 * "opens tomorrow" line reading off one rule instead of two that can drift.
 */
export function opensOn(
  startDate: string, day: number, cadenceDays = 1,
): string {
  const interval = Math.max(1, cadenceDays);
  const [y, m, d] = startDate.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d) + Math.max(0, day - 1) * interval * 86_400_000);
  return at.toISOString().slice(0, 10);
}

/** How the wait reads: today, tomorrow, a weekday inside the week, else a date. */
export function opensLabel(openISO: string, todayISO: string): string {
  const away = daysBetween(todayISO, openISO);
  if (away <= 0) return 'now';
  if (away === 1) return 'tomorrow morning';
  const [y, m, d] = openISO.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  if (away < 7) {
    return `on ${at.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}`;
  }
  return `on ${at.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
}
