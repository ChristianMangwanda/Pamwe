import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { getUserCouple } from './couples';
import { getActiveCouPlan } from './plans';
import { countMyTotalSubmitted } from './entries';
import { getPrayers } from './prayers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  if (!projectId) {
    console.warn('[notifications] No EAS projectId configured; skipping push token registration.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}

// Skip the PATCH when this device already saved the same token for the same
// user. getExpoPushTokenAsync re-registers with APNs, which re-fires the
// rotation listener with an unchanged token; without this guard every launch
// spiraled into an infinite PATCH /users loop (build 7 slowness + crash).
let lastSavedTokenKey: string | null = null;

export async function savePushToken(token: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const key = `${user.id}:${token}`;
  if (key === lastSavedTokenKey) return;

  const { error } = await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', user.id);
  if (!error) lastSavedTokenKey = key;
}

// On sign-out: this device no longer speaks for that user. Without this, an
// account switch leaves the OLD user's row holding this device's token and
// their partner's pushes land on the wrong person's phone.
export async function clearPushToken() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase
    .from('users')
    .update({ expo_push_token: null })
    .eq('id', user.id);
  lastSavedTokenKey = null;
}

// Clear the banners this device has ALREADY delivered. iOS keeps delivered
// notifications in Notification Center until they're dismissed, so old "partner
// submitted"/"new prayer" pushes stack up and read as if they keep arriving.
// This only clears DELIVERED notifications: SCHEDULED ones (the prayer and
// morning reminders live as scheduled notifications) are left intact, so it is
// safe to call on every foreground. Never swap this for a cancel-all.
export async function clearDeliveredNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // best-effort — a stale banner is a cosmetic annoyance, not a failure
  }
}

// iOS can rotate the underlying APNs token; re-derive and persist the Expo
// token when that happens so pushes keep flowing. The listener only reacts to
// a genuinely NEW native token: re-deriving calls getExpoPushTokenAsync, which
// re-registers with APNs and echoes the same token back to this listener.
let lastNativeToken: string | null = null;
let rotationInFlight = false;

export function watchPushTokenRotation() {
  return Notifications.addPushTokenListener((devicePushToken) => {
    const native =
      typeof devicePushToken.data === 'string'
        ? devicePushToken.data
        : JSON.stringify(devicePushToken.data);
    if (native === lastNativeToken) return;
    lastNativeToken = native;

    if (rotationInFlight) return;
    rotationInFlight = true;
    registerForPushNotifications()
      .then((token) => {
        if (token) return savePushToken(token);
      })
      .finally(() => {
        rotationInFlight = false;
      });
  });
}

// Schedule the reminder from the user's saved preference — never a hardcoded
// default (a launch-time 06:30 call used to override Settings). Runs on every
// sign-in, which is also what tops the dated reminders of a slower cadence back
// up before the scheduled batch runs out.
export async function scheduleMorningFromPrefs() {
  try {
    const status = await getNotificationPermissionStatus();
    if (status !== 'granted') return;
    const prefs = await getNotificationPrefs();
    const [hour, minute] = (prefs?.notification_morning_time ?? '06:30:00')
      .split(':')
      .map(Number);

    // A couple reading weekly should not be reminded daily: that is the very
    // pressure the cadence exists to relieve.
    const couple = await getUserCouple().catch(() => null);
    const plan = couple ? await getActiveCouPlan(couple.id).catch(() => null) : null;

    await scheduleMorningNotification(hour, minute, plan?.cadence_days ?? 1, plan?.start_date);
  } catch {
    // best-effort — Settings re-schedules whenever the user changes the time
  }
}

// The weekly recap reminder. The recaps screen has always shown a mock banner
// saying "Your week together is ready" under the caption "Sent to you both",
// but nothing ever sent it: no notify-recap function, no cron, no weekly
// trigger. It was built when APNs wasn't set up yet and recorded as "mock
// only", then never picked back up once push went live.
//
// It is scheduled ON DEVICE rather than server-side, for the same reason the
// morning reminder is: a local weekly trigger fires at 9am in whatever
// timezone the phone is actually in, with no cron job, no service-role port of
// the recap aggregation, and no per-couple timezone maths. The tradeoff is
// that the banner body is fixed when scheduled, so it can't carry that week's
// headline; it says a recap is ready, and the screen shows the real thing.
const RECAP_ID = 'pamwe-recap';
// expo-notifications weekday is 1-7 with 1 = Sunday.
const RECAP_WEEKDAY = 1;
const RECAP_HOUR = 9;

export async function cancelWeeklyRecap() {
  await Notifications.cancelScheduledNotificationAsync(RECAP_ID).catch(() => {});
}

// Schedule (or re-schedule) the Sunday recap nudge. Cancels by id only, never
// cancel-all: that once silently killed every prayer reminder on launch.
export async function scheduleWeeklyRecap() {
  await cancelWeeklyRecap();
  await Notifications.scheduleNotificationAsync({
    identifier: RECAP_ID,
    content: {
      title: 'Your week together is ready',
      body: 'Look back on what you read and prayed for.',
      sound: true,
      data: { type: 'recap' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: RECAP_WEEKDAY,
      hour: RECAP_HOUR,
      minute: 0,
    },
  });
}

// Runs on sign-in beside scheduleMorningFromPrefs. Only schedules once the
// couple has actually read something: telling a couple who have never opened a
// day that "your week together is ready" is worse than staying quiet.
export async function scheduleRecapFromPrefs() {
  try {
    const status = await getNotificationPermissionStatus();
    if (status !== 'granted') return;

    const prefs = await getNotificationPrefs();
    if (prefs?.notification_recap === false) {
      await cancelWeeklyRecap();
      return;
    }

    const couple = await getUserCouple().catch(() => null);
    if (!couple?.id) return;
    const daysRead = await countMyTotalSubmitted(couple.id).catch(() => 0);
    if (daysRead < 1) {
      await cancelWeeklyRecap();
      return;
    }

    await scheduleWeeklyRecap();
  } catch {
    // best-effort — Settings re-schedules whenever the toggle changes
  }
}

// The weekly prayer review. Per-prayer reminders now go quiet as soon as you
// have prayed for something, so this is the one nudge that still arrives: a
// Sunday-evening prompt to look over the list and see what still needs praying
// for. It replaces the daily nagging rather than adding to it.
//
// Sunday 6pm, deliberately away from the 9am reading recap so the two never
// stack on one morning.
const PRAYER_REVIEW_ID = 'pamwe-prayer-review';
const PRAYER_REVIEW_WEEKDAY = 1; // 1 = Sunday
const PRAYER_REVIEW_HOUR = 18;

export async function cancelPrayerReview() {
  await Notifications.cancelScheduledNotificationAsync(PRAYER_REVIEW_ID).catch(() => {});
}

export async function schedulePrayerReview() {
  await cancelPrayerReview();
  await Notifications.scheduleNotificationAsync({
    identifier: PRAYER_REVIEW_ID,
    content: {
      title: 'Your prayers for the week',
      body: 'Check which ones still need praying for.',
      sound: true,
      data: { type: 'prayer_review' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: PRAYER_REVIEW_WEEKDAY,
      hour: PRAYER_REVIEW_HOUR,
      minute: 0,
    },
  });
}

// Runs on sign-in beside the morning and recap schedulers. Only arms once the
// couple actually has an active prayer, so an empty list is never reviewed.
export async function schedulePrayerReviewFromPrefs() {
  try {
    const status = await getNotificationPermissionStatus();
    if (status !== 'granted') return;

    const prefs = await getNotificationPrefs();
    if (prefs?.notification_prayer === false) {
      await cancelPrayerReview();
      return;
    }

    const couple = await getUserCouple().catch(() => null);
    if (!couple?.id) return;
    const active = await getPrayers(couple.id, 'active').catch(() => []);
    if (active.length === 0) {
      await cancelPrayerReview();
      return;
    }

    await schedulePrayerReview();
  } catch {
    // best-effort — the prayers tab re-syncs this whenever it loads
  }
}

export type NotificationPrefs = {
  notification_morning_time: string; // 'HH:MM:SS'
  notification_partner: boolean;
  notification_prayer: boolean;
  notification_dream: boolean;
  notification_recap: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('notification_morning_time, notification_partner, notification_prayer, notification_dream, notification_recap')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data as NotificationPrefs;
}

export async function updateNotificationPrefs(prefs: Partial<NotificationPrefs>) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('users').update(prefs).eq('id', user.id);
  if (error) throw error;
}

// 'granted' | 'denied' | 'undetermined'
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Nudge my partner to read today. The edge function enforces a one-per-hour
// cooldown per sender and sends the push. Returns a result the UI can voice.
// `delivered` is false when the nudge was logged but no banner could land, so
// the UI can say which of the two happened instead of claiming success.
export type NudgeResult = {
  ok: boolean;
  cooldown?: boolean;
  delivered?: boolean;
  message?: string;
};

export async function nudgePartner(): Promise<NudgeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-nudge', { body: {} });
    if (error) return { ok: false, message: "The nudge didn't send. Try again in a moment." };
    if (data?.cooldown) return { ok: false, cooldown: true, message: data?.message };
    if (!data?.ok) {
      const message =
        data?.reason === 'no_partner' || data?.reason === 'no_couple'
          ? "You're not paired with anyone yet."
          : "The nudge didn't send. Try again in a moment.";
      return { ok: false, message };
    }
    return { ok: true, delivered: data?.delivered !== false };
  } catch {
    return { ok: false, message: "The nudge didn't send. Try again in a moment." };
  }
}

// "Thinking of you": one tap on Today, no reading and nothing to do attached.
// Same shape as nudgePartner; the edge function holds a 30-minute cooldown per
// sender, kept separate from the read-nudge's so neither silences the other.
export async function thinkingOfYou(): Promise<NudgeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('notify-thinking', { body: {} });
    if (error) return { ok: false, message: "That didn't send. Try again in a moment." };
    if (data?.cooldown) return { ok: false, cooldown: true, message: data?.message };
    if (!data?.ok) {
      const message =
        data?.reason === 'no_partner' || data?.reason === 'no_couple'
          ? "You're not paired with anyone yet."
          : "That didn't send. Try again in a moment.";
      return { ok: false, message };
    }
    return { ok: true, delivered: data?.delivered !== false };
  } catch {
    return { ok: false, message: "That didn't send. Try again in a moment." };
  }
}

// Stable ids for the morning reminder, so re-scheduling replaces only its own
// notifications. This used to call cancelAllScheduledNotificationsAsync(), which
// also silently cancelled every prayer reminder (prayerReminders.ts owns those
// by id) on every sign-in, while their stored ids still claimed they were set.
const MORNING_ID = 'pamwe-morning';
// A non-daily rhythm has no repeating trigger that also honours a chosen clock
// time, so those get individually dated reminders, topped up on each launch.
const MORNING_AHEAD = 12;
const morningIdAt = (i: number) => `${MORNING_ID}-${i}`;

async function cancelMorningReminders() {
  const ids = [MORNING_ID, ...Array.from({ length: MORNING_AHEAD }, (_, i) => morningIdAt(i))];
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

const MORNING_CONTENT = {
  title: "Today's reading is ready",
  body: 'Open Pamwe and read it together.',
  sound: true,
  data: { type: 'morning' },
};

// The next `count` reading days at hour:minute, from a start date on a cadence.
// Exported for testing: the arithmetic is the whole feature.
export function nextReadingDates(
  startDate: string, cadenceDays: number, hour: number, minute: number,
  count: number, now: Date = new Date(),
): Date[] {
  const interval = Math.max(1, cadenceDays);
  const [y, m, d] = startDate.split('-').map(Number);
  const dates: Date[] = [];
  for (let step = 0; dates.length < count; step++) {
    const when = new Date(y, m - 1, d + step * interval, hour, minute, 0, 0);
    if (when > now) dates.push(when);
    // A long-running plan on a daily cadence would otherwise scan forever.
    if (step > 5000) break;
  }
  return dates;
}

export async function scheduleMorningNotification(
  hour: number, minute: number, cadenceDays = 1, startDate?: string,
) {
  await cancelMorningReminders();

  if (cadenceDays <= 1 || !startDate) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: MORNING_CONTENT,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return;
  }

  const dates = nextReadingDates(startDate, cadenceDays, hour, minute, MORNING_AHEAD);
  await Promise.all(
    dates.map((date, i) =>
      Notifications.scheduleNotificationAsync({
        identifier: morningIdAt(i),
        content: MORNING_CONTENT,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      }),
    ),
  );
}
