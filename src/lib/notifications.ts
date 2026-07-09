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

export async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', user.id);
}

export type NotificationPrefs = {
  notification_morning_time: string; // 'HH:MM:SS'
  notification_partner: boolean;
  notification_prayer: boolean;
};

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
