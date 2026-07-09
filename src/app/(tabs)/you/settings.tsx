import { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { BackLink } from '../../../components/ui/BackLink';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import {
  getNotificationPrefs, updateNotificationPrefs, getNotificationPermissionStatus,
  scheduleMorningNotification, NotificationPrefs,
} from '../../../lib/notifications';

const MORNING_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00'];
const hhmm = (time: string) => time?.slice(0, 5) ?? '06:30';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<string>('granted');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [p, status] = await Promise.all([getNotificationPrefs(), getNotificationPermissionStatus()]);
          if (!active) return;
          setPrefs(p);
          setPermission(status);
        } catch {
          // leave defaults
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []),
  );

  const savePref = async (patch: Partial<NotificationPrefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await updateNotificationPrefs(patch);
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    }
  };

  const setMorningTime = async (time: string) => {
    await savePref({ notification_morning_time: `${time}:00` });
    if (permission === 'granted') {
      const [h, m] = time.split(':').map(Number);
      try { await scheduleMorningNotification(h, m); } catch { /* best-effort */ }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          try { await GoogleSignin.signOut(); } catch { /* not a Google session */ }
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  const notificationsOff = permission === 'denied';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Settings</Text>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Notifications</Text>
        <Card style={styles.card}>
          {notificationsOff && (
            <TouchableOpacity style={[styles.banner, { backgroundColor: colors.line2 }]} activeOpacity={0.7} onPress={() => Linking.openSettings()}>
              <Text variant="body" color={colors.accent}>
                Notifications are turned off for Pamwe in your phone settings. Tap to turn them back on.
              </Text>
            </TouchableOpacity>
          )}

          <Text variant="body" color={colors.ink2} style={styles.rowLabel}>Morning reminder</Text>
          <View style={styles.presetRow}>
            {MORNING_PRESETS.map((t) => {
              const active = prefs ? hhmm(prefs.notification_morning_time) === t : false;
              return (
                <TouchableOpacity key={t} onPress={() => setMorningTime(t)} activeOpacity={0.8}
                  style={[styles.preset, { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accent : 'transparent' }]}>
                  <Text variant="label" color={active ? colors.bg : colors.ink2}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow label="Partner reflections" description="When your partner submits, so both unlock." value={prefs?.notification_partner ?? true} onChange={(v) => savePref({ notification_partner: v })} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow label="New prayers" description="When your partner adds a prayer point." value={prefs?.notification_prayer ?? true} onChange={(v) => savePref({ notification_prayer: v })} colors={colors} />
        </Card>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Plan</Text>
        <Card style={styles.card}>
          <ActionRow label="Change reading plan" onPress={() => router.push('/(onboarding)/plan-select?mode=change')} colors={colors} />
        </Card>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Account</Text>
        <Card style={styles.card}>
          {user?.email ? (
            <>
              <Text variant="body" color={colors.ink2} style={styles.rowLabel}>Signed in as</Text>
              <Text variant="body" color={colors.ink} style={styles.email}>{user.email}</Text>
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
            </>
          ) : null}
          <ActionRow label="Sign out" onPress={handleSignOut} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ActionRow label="Delete account" destructive onPress={() => router.push('/(tabs)/you/delete-account')} colors={colors} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, description, value, onChange, colors }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void; colors: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text variant="body" color={colors.ink}>{label}</Text>
        <Text variant="body" color={colors.muted} style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label}
        trackColor={{ false: colors.line, true: colors.accent2 }} thumbColor={value ? colors.accent : colors.surface} />
    </View>
  );
}

function ActionRow({ label, onPress, destructive, colors }: { label: string; onPress: () => void; destructive?: boolean; colors: any }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
      <Text variant="body" color={destructive ? colors.accent : colors.ink}>{label}</Text>
      <Text variant="body" color={colors.muted}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  title: { marginTop: 14 },
  sectionLabel: { marginTop: 20, marginBottom: 10, marginLeft: 4 },
  card: { padding: 20 },
  banner: { borderRadius: 12, padding: 14, marginBottom: 16 },
  rowLabel: { marginBottom: 10 },
  email: { marginBottom: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  divider: { height: 1, marginVertical: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, paddingRight: 16 },
  toggleDesc: { marginTop: 4, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
});
