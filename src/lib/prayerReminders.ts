import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getNotificationPermissionStatus } from './notifications';

// Per-prayer reminders, entirely on-device: local notifications, no backend, no
// partner involvement. Keyed by prayer id.
//
// These used to be a single DAILY repeating trigger per prayer, which had two
// problems. It never stopped, so a prayer from weeks ago still recited itself
// every night; and a repeating trigger cannot be skipped for one day, so
// marking "I prayed today" changed nothing.
//
// They are now DATED one-shots over a rolling window, re-armed by syncReminders
// on every visit to the Prayers tab. That makes "quiet once you've prayed"
// expressible (cancel just today's) and makes reminders self-healing: a prayer
// answered or deleted on the PARTNER'S phone drops off this one too, which the
// old local-only clearReminder could never do.
//
// iOS keeps at most 64 pending local notifications and silently drops the rest,
// so the window is budgeted rather than fixed: with many reminders each gets a
// shorter horizon. The app is opened most days, which is what tops them up.

const STORE_KEY = 'pamwe:prayerReminders';

type Reminder = { hour: number; minute: number };
type ReminderMap = Record<string, Reminder>;

const PRAYER_BUDGET = 40;   // leaves room for the morning reminder (up to 12) + recap
const MAX_AHEAD_DAYS = 7;
const MIN_AHEAD_DAYS = 2;
// Cancels sweep one day behind the window so yesterday's leftover never lingers.
const SWEEP_BACK_DAYS = 1;

async function readMap(): Promise<ReminderMap> {
  try {
    const v = await AsyncStorage.getItem(STORE_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: ReminderMap) {
  try { await AsyncStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch { /* best effort */ }
}

// Local calendar date (YYYY-MM-DD). These fire in device local time, so the
// device's own date is the right one to key by.
function localDateISO(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayLocalISO(): string {
  return localDateISO(new Date());
}

const idFor = (prayerId: string, dateISO: string) => `pamwe-prayer-${prayerId}-${dateISO}`;

// Cancel every id this prayer could hold, across a superset of the window.
async function cancelWindow(prayerId: string) {
  const base = new Date();
  const ids: string[] = [];
  for (let i = -SWEEP_BACK_DAYS; i <= MAX_AHEAD_DAYS; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    ids.push(idFor(prayerId, localDateISO(d)));
  }
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

function bodyFor(prayerText: string) {
  return prayerText.length > 90 ? `${prayerText.slice(0, 88).trim()}…` : prayerText;
}

// Arm the next `days` occurrences, skipping any that have already passed and
// (optionally) today, when the couple has already prayed for this one.
async function armWindow(
  prayerId: string, prayerText: string, hour: number, minute: number,
  days: number, skipToday: boolean,
) {
  await cancelWindow(prayerId);
  const now = new Date();
  const jobs: Promise<unknown>[] = [];

  for (let i = 0; i < days; i++) {
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (when <= now) continue;                       // today's slot already passed
    if (i === 0 && skipToday) continue;              // already prayed today
    jobs.push(
      Notifications.scheduleNotificationAsync({
        identifier: idFor(prayerId, localDateISO(when)),
        content: {
          title: 'Time to pray',
          body: bodyFor(prayerText),
          sound: true,
          data: { type: 'prayer_reminder', prayerId },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      }).catch(() => {}),
    );
  }
  await Promise.all(jobs);
}

export async function getReminder(prayerId: string): Promise<{ hour: number; minute: number } | null> {
  const map = await readMap();
  const r = map[prayerId];
  return r ? { hour: r.hour, minute: r.minute } : null;
}

// Set (or reset) a reminder. Returns false if the OS denied notifications, so
// the UI can nudge toward Settings.
export async function setReminder(
  prayerId: string, prayerText: string, hour: number, minute: number,
): Promise<boolean> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    if (asked !== 'granted') return false;
  }

  const map = await readMap();
  map[prayerId] = { hour, minute };
  await writeMap(map);

  const days = windowFor(Object.keys(map).length);
  await armWindow(prayerId, prayerText, hour, minute, days, false);
  return true;
}

export async function clearReminder(prayerId: string) {
  await cancelWindow(prayerId);
  const map = await readMap();
  if (map[prayerId]) {
    delete map[prayerId];
    await writeMap(map);
  }
}

// Praying for something ends the asking. Not just for today: being reminded
// daily about a prayer you have already prayed is the nag Christian hit. The
// stored time is kept, so once the mark ages out of the week window syncReminders
// arms it again, and the Sunday review is what surfaces it in the meantime.
export async function silenceForWeek(prayerId: string) {
  await cancelWindow(prayerId);
}

function windowFor(reminderCount: number): number {
  if (reminderCount <= 0) return MAX_AHEAD_DAYS;
  const perPrayer = Math.floor(PRAYER_BUDGET / reminderCount);
  return Math.max(MIN_AHEAD_DAYS, Math.min(MAX_AHEAD_DAYS, perPrayer));
}

// Re-arm every stored reminder against the prayers that actually still exist,
// and drop the ones that don't. This is what makes a prayer answered or deleted
// on the partner's phone stop reminding on this one: clearReminder only ever
// ran on the device that acted, so the other phone kept firing forever.
export async function syncReminders(
  prayers: { id: string; text: string; status?: string }[],
  prayedThisWeekIds: string[] = [],
) {
  try {
    const map = await readMap();
    const ids = Object.keys(map);
    if (ids.length === 0) return;

    const live = new Map(
      prayers.filter((p) => p.status !== 'answered').map((p) => [p.id, p.text]),
    );

    let changed = false;
    const survivors = ids.filter((id) => live.has(id));
    const days = windowFor(survivors.length);

    for (const prayerId of ids) {
      const text = live.get(prayerId);
      if (!text) {
        // Answered or deleted, possibly by the partner. Stop reminding.
        await cancelWindow(prayerId);
        delete map[prayerId];
        changed = true;
        continue;
      }
      if (prayedThisWeekIds.includes(prayerId)) {
        // Already prayed for this week: stay quiet entirely rather than asking
        // again tomorrow. The Sunday review is the one nudge that still comes.
        await cancelWindow(prayerId);
        continue;
      }
      const r = map[prayerId];
      await armWindow(prayerId, text, r.hour, r.minute, days, false);
    }

    if (changed) await writeMap(map);
  } catch {
    // best effort — reminders are a convenience, never block the list
  }
}
