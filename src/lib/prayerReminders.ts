import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getNotificationPermissionStatus } from './notifications';

// Per-prayer daily reminders, entirely on-device: a local notification, no
// backend, no partner involvement. The map persists the scheduled id so we can
// cancel it later. Keyed by prayer id.

const STORE_KEY = 'pamwe:prayerReminders';

type Reminder = { hour: number; minute: number; notificationId: string };
type ReminderMap = Record<string, Reminder>;

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

export async function getReminder(prayerId: string): Promise<{ hour: number; minute: number } | null> {
  const map = await readMap();
  const r = map[prayerId];
  return r ? { hour: r.hour, minute: r.minute } : null;
}

// Schedule (or reschedule) a daily reminder for one prayer. Returns false if
// the OS denied notifications, so the UI can nudge toward Settings.
export async function setReminder(
  prayerId: string, prayerText: string, hour: number, minute: number,
): Promise<boolean> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    if (asked !== 'granted') return false;
  }

  const map = await readMap();
  const existing = map[prayerId];
  if (existing) {
    try { await Notifications.cancelScheduledNotificationAsync(existing.notificationId); } catch { /* already gone */ }
  }

  const body = prayerText.length > 90 ? `${prayerText.slice(0, 88).trim()}…` : prayerText;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'A prayer to carry',
      body,
      sound: true,
      data: { type: 'prayer_reminder', prayerId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });

  map[prayerId] = { hour, minute, notificationId };
  await writeMap(map);
  return true;
}

export async function clearReminder(prayerId: string) {
  const map = await readMap();
  const existing = map[prayerId];
  if (existing) {
    try { await Notifications.cancelScheduledNotificationAsync(existing.notificationId); } catch { /* already gone */ }
    delete map[prayerId];
    await writeMap(map);
  }
}
