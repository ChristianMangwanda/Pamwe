import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

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

// Schedule the daily reminder from the user's saved preference — never a
// hardcoded default (a launch-time 06:30 call used to override Settings).
export async function scheduleMorningFromPrefs() {
  try {
    const status = await getNotificationPermissionStatus();
    if (status !== 'granted') return;
    const prefs = await getNotificationPrefs();
    const [hour, minute] = (prefs?.notification_morning_time ?? '06:30:00')
      .split(':')
      .map(Number);
    await scheduleMorningNotification(hour, minute);
  } catch {
    // best-effort — Settings re-schedules whenever the user changes the time
  }
}

export type NotificationPrefs = {
  notification_morning_time: string; // 'HH:MM:SS'
  notification_partner: boolean;
  notification_prayer: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('notification_morning_time, notification_partner, notification_prayer')
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

export async function scheduleMorningNotification(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning',
      body: "Today's reading is waiting for you and your partner.",
      sound: true,
      data: { type: 'morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
