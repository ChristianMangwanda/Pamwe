import { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { BackLink } from '../../../components/ui/BackLink';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { setPlanCadence, CADENCE_OPTIONS, type Cadence } from '../../../lib/plans';
import { haptics } from '../../../lib/haptics';
import {
  getNotificationPrefs, updateNotificationPrefs, getNotificationPermissionStatus,
  scheduleMorningNotification, scheduleWeeklyRecap, cancelWeeklyRecap,
  schedulePrayerReview, cancelPrayerReview, NotificationPrefs,
} from '../../../lib/notifications';

const MORNING_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00'];
const hhmm = (time: string) => time?.slice(0, 5) ?? '06:30';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { couplePlan, refresh: refreshCouple } = useCouple();

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<string>('granted');
  const cadence = (couplePlan?.cadence_days ?? 1) as Cadence;

  // The shell paints immediately; prefs and permission fill in as they land.
  // Every row already tolerates a null prefs (`prefs?.`), so there is nothing
  // to gate on — the old full-screen spinner made Settings feel slow to open.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getNotificationPrefs()
        .then((p) => { if (active) setPrefs(p); })
        .catch(() => { /* leave defaults */ });
      getNotificationPermissionStatus()
        .then((status) => { if (active) setPermission(status); })
        .catch(() => { /* leave defaults */ });
      return () => { active = false; };
    }, []),
  );

  // The couple's plan is the source of truth, so refresh rather than hold a
  // local copy: the partner can change the rhythm too.
  const saveCadence = async (key: string) => {
    if (!couplePlan) return;
    haptics.tap();
    const next = Number(key) as Cadence;
    try {
      await setPlanCadence(couplePlan.id, next);
      await refreshCouple();
      await rescheduleMorning(undefined, next);
    } catch (err: any) {
      Alert.alert("Couldn't save that", err?.message ?? 'Try again in a moment.');
    }
  };

  const savePref = async (patch: Partial<NotificationPrefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await updateNotificationPrefs(patch);
    } catch (err: any) {
      Alert.alert("Couldn't save that", err?.message ?? 'Try again in a moment.');
    }
  };

  const setMorningTime = async (time: string) => {
    await savePref({ notification_morning_time: `${time}:00` });
    await rescheduleMorning(time);
  };

  // The reminder follows the rhythm, so it has to be rebuilt whenever either
  // the time or the cadence changes.
  const rescheduleMorning = async (time?: string, nextCadence: Cadence = cadence) => {
    if (permission !== 'granted') return;
    const hhmmStr = time ?? hhmm(prefs?.notification_morning_time ?? '06:30:00');
    const [h, m] = hhmmStr.split(':').map(Number);
    try {
      await scheduleMorningNotification(h, m, nextCadence, couplePlan?.start_date);
    } catch { /* best-effort */ }
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
          <ToggleRow label="Partner reflections" description="When your partner submits, replies to you, nudges you, or is thinking of you." value={prefs?.notification_partner ?? true} onChange={(v) => savePref({ notification_partner: v })} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow label="Prayers" description="When your partner adds one, plus a Sunday look at what still needs praying for." value={prefs?.notification_prayer ?? true} onChange={(v) => { savePref({ notification_prayer: v }); if (v) schedulePrayerReview(); else cancelPrayerReview(); }} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow label="New dreams" description="When your partner writes down a dream." value={prefs?.notification_dream ?? true} onChange={(v) => savePref({ notification_dream: v })} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow label="Verse notes" description="When your partner takes note of a verse. Once per verse, not on every edit." value={prefs?.notification_note ?? true} onChange={(v) => savePref({ notification_note: v })} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ToggleRow
            label="Weekly recap"
            description="Sunday morning, a look back at your week."
            value={prefs?.notification_recap ?? true}
            onChange={(v) => { savePref({ notification_recap: v }); if (v) scheduleWeeklyRecap(); else cancelWeeklyRecap(); }}
            colors={colors}
          />
        </Card>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Plan</Text>
        <Card style={styles.card}>
          {/* Rhythm is changeable mid-plan: only the pace moves, the day you're
              on and your streak stand. */}
          {couplePlan && (
            <>
              <Text variant="body" color={colors.ink2} style={styles.rowLabel}>Reading rhythm</Text>
              <SegmentedControl
                segments={CADENCE_OPTIONS.map((o) => ({ key: String(o.value), label: o.label }))}
                value={String(cadence)}
                onChange={saveCadence}
              />
              <Text style={[styles.cadenceBlurb, { color: colors.muted }]}>
                {CADENCE_OPTIONS.find((o) => o.value === cadence)?.blurb}
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
            </>
          )}
          {/* Same destination as the You tab's row of the same name: the Plans
              tab is the one switch surface (plan detail confirms and calls
              switchPlan). The old onboarding picker only knew the 4 curated
              plans. */}
          <ActionRow label="Change reading plan" onPress={() => router.push('/(tabs)/plans')} colors={colors} />
        </Card>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Account</Text>
        <Card style={styles.card}>
          <ActionRow label="Your name" onPress={() => router.push('/(tabs)/you/name')} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
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
  cadenceBlurb: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, paddingRight: 16 },
  toggleDesc: { marginTop: 4, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
});
