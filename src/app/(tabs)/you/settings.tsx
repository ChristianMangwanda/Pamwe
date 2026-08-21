import { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking, Alert, Platform,
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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock, EyeSlash } from 'phosphor-react-native';
import { setPlanCadence, CADENCE_OPTIONS, type Cadence } from '../../../lib/plans';
import { haptics } from '../../../lib/haptics';
import {
  getNotificationPrefs, updateNotificationPrefs, getNotificationPermissionStatus,
  scheduleMorningNotification, scheduleWeeklyRecap, cancelWeeklyRecap,
  schedulePrayerReview, cancelPrayerReview, NotificationPrefs,
  requestPushPermission,
  scheduleMorningFromPrefs, cancelMorningNotification,
  reconcilePushRegistration, type PushRegistration,
} from '../../../lib/notifications';

const MORNING_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00'];
const hhmm = (time: string) => time?.slice(0, 5) ?? '06:30';

// The stored 'HH:MM:SS' as a Date, which is all the picker understands. The
// calendar day is irrelevant and never read back.
const timeAsDate = (time?: string) => {
  const [h, m] = hhmm(time ?? '06:30:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 6, m ?? 30, 0, 0);
  return d;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { couplePlan, partner, refresh: refreshCouple } = useCouple();
  const partnerFirstName = (partner?.display_name ?? 'Your partner').trim().split(/\s+/)[0];

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<string>('granted');
  // Starts registered for the same reason permission starts granted: the shell
  // paints before the lookup lands, and a banner that flashes an accusation and
  // withdraws it is worse than one that arrives a beat late.
  const [registration, setRegistration] = useState<PushRegistration>('registered');
  const [pickingTime, setPickingTime] = useState(false);
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
      // Repairs a missing row on the spot, so the usual outcome here is that
      // nothing is shown and pushes simply start working again. The banner
      // below is only for the case where the repair itself failed.
      reconcilePushRegistration()
        .then((r) => { if (active) setRegistration(r); })
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

  // Whether the saved time is one of the five chips, which decides whether the
  // custom-time link offers a change or reports the time already chosen.
  const isPreset = MORNING_PRESETS.includes(hhmm(prefs?.notification_morning_time ?? '06:30:00'));

  const cancelMorning = async () => {
    try { await cancelMorningNotification(); }
    catch { /* the pref is saved either way; the next launch reconciles */ }
  };

  // iOS keeps the spinner open and reports every turn; Android closes on the
  // first answer. Dismissing without choosing arrives as 'dismissed'.
  const onPickTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== 'ios') setPickingTime(false);
    if (event.type === 'dismissed' || !picked) return;
    const hh = String(picked.getHours()).padStart(2, '0');
    const mm = String(picked.getMinutes()).padStart(2, '0');
    setMorningTime(`${hh}:${mm}`);
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

  // Taking the offer here also schedules the local reminders, which
  // scheduleMorningFromPrefs and friends skip while permission is unresolved.
  // Without that, saying yes from Settings turned on partner pushes but left
  // the morning reminder silently unscheduled until the next sign-in.
  // The retry behind the banner above. Permission is already granted here, so
  // there is nothing to ask for: this is only the write that did not land.
  const reconnectPush = async () => {
    haptics.tap();
    setRegistration(await reconcilePushRegistration().catch(() => 'unknown' as PushRegistration));
  };

  const enablePush = async () => {
    haptics.tap();
    const granted = await requestPushPermission().catch(() => false);
    setPermission(granted ? 'granted' : 'denied');
    if (!granted) return;
    // Same verified write as everywhere else, so saying yes here cannot leave
    // the phone in the allowed-but-unregistered state this screen now names.
    setRegistration(await reconcilePushRegistration().catch(() => 'unknown' as PushRegistration));
    scheduleMorningFromPrefs();
    if (prefs?.notification_recap ?? true) scheduleWeeklyRecap();
    if (prefs?.notification_prayer ?? true) schedulePrayerReview();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Settings</Text>

        {/* Account sits first, above the notification toggles it used to sit
            below. Everything a person comes to Settings to DO to their account,
            check which one they are signed in as, sign out, leave the pair,
            delete, was three screens of preferences down a scroll, and the
            toggles are the part you set once and never revisit. Apple also asks
            that account deletion be easy to find (5.1.1(v)), and it was not. */}
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
          {/* Leaving the pair is not deleting your account, and putting them
              side by side is what makes people delete when they meant to
              leave. This one keeps everything; the one below does not. */}
          <ActionRow label="Leave the pair" onPress={() => router.push('/(tabs)/you/leave')} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ActionRow label="Delete account" destructive onPress={() => router.push('/(tabs)/you/delete-account')} colors={colors} />
        </Card>

        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>Notifications</Text>
        <Card style={styles.card}>
          {notificationsOff && (
            <TouchableOpacity style={[styles.banner, { backgroundColor: colors.line2 }]} activeOpacity={0.7} onPress={() => Linking.openSettings()}>
              <Text variant="body" color={colors.accent}>
                Notifications are turned off for Pamwe in your phone settings. Tap to turn them back on.
              </Text>
            </TouchableOpacity>
          )}

          {/* Allowed by the phone, unknown to the server. The toggles below
              would all read on while nothing could ever arrive, so this is the
              one state that has to say so out loud. Only shown when the
              automatic repair on open failed, which leaves a retry as the
              honest offer. */}
          {(registration === 'unregistered' || registration === 'no_token') && (
            <TouchableOpacity style={[styles.banner, { backgroundColor: colors.line2 }]} activeOpacity={0.7} onPress={reconnectPush}>
              <Text variant="body" color={colors.accent}>
                {registration === 'no_token'
                  ? 'Notifications are on for Pamwe, but this phone could not register with Apple. Tap to try again, or restart the phone if it keeps failing.'
                  : 'This phone is allowed to show notifications but is not connected to your account yet. Tap to reconnect it.'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Never asked, or asked and put off at the connected screen. The
              toggles below are all preferences about pushes this phone cannot
              receive yet, so the offer belongs above them. */}
          {permission === 'undetermined' && (
            <TouchableOpacity style={[styles.banner, { backgroundColor: colors.line2 }]} activeOpacity={0.7} onPress={enablePush}>
              <Text variant="body" color={colors.accent}>
                Turn on notifications to know when your partner has written, without checking.
              </Text>
            </TouchableOpacity>
          )}

          {/* Off is a real answer. Until this switch existed the only way to
              stop the morning reminder was to turn off notifications for the
              whole app, which also took away the partner's reflection landing,
              the thing people actually want. */}
          <ToggleRow
            label="Morning reminder"
            description="A gentle nudge that the day's reading is ready."
            value={prefs?.notification_morning ?? true}
            onChange={(v) => { savePref({ notification_morning: v }); if (v) rescheduleMorning(); else cancelMorning(); }}
            colors={colors}
          />

          {(prefs?.notification_morning ?? true) && (
            <>
              <View style={styles.presetRow}>
                {MORNING_PRESETS.map((t) => {
                  const active = prefs ? hhmm(prefs.notification_morning_time) === t : false;
                  return (
                    <TouchableOpacity key={t} onPress={() => setMorningTime(t)} activeOpacity={0.8}
                      accessibilityRole="button" accessibilityState={{ selected: active }}
                      style={[styles.preset, { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accent : 'transparent' }]}>
                      <Text variant="label" color={active ? colors.bg : colors.ink2}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Five presets covered five mornings. Someone who rises at 5:15,
                  or reads at night, was simply not catered for. */}
              <TouchableOpacity
                onPress={() => { haptics.tap(); setPickingTime(true); }}
                style={styles.customTime}
                accessibilityRole="button"
                accessibilityLabel="Choose another reminder time"
              >
                <Clock size={14} color={colors.accent2} />
                <Text style={[styles.customTimeLabel, { color: colors.accent2 }]}>
                  {isPreset ? 'Another time' : `At ${hhmm(prefs?.notification_morning_time ?? '06:30:00')}, tap to change`}
                </Text>
              </TouchableOpacity>

              {pickingTime && (
                <DateTimePicker
                  value={timeAsDate(prefs?.notification_morning_time)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onPickTime}
                />
              )}
            </>
          )}

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

        {/* These banners carry the most private material the app holds: a
            partner's reflection arriving, the words of a new prayer, a dream.
            All of it renders on a locked phone, in front of whoever happens to
            be looking at it. iOS can hide previews, but only for every app at
            once, and this is the one where it matters most.

            One control rather than one per category, deliberately: a setting
            you have to reason about six times is one nobody sets, and the
            answer is nearly always the same for all of them. */}
        <Text variant="eyebrow" color={colors.muted} style={styles.sectionLabel}>On the lock screen</Text>
        <Card style={styles.card}>
          <View style={styles.previewHead}>
            <EyeSlash size={17} color={colors.accent2} />
            <Text variant="body" color={colors.ink2} style={styles.flex}>
              What a notification shows before you unlock.
            </Text>
          </View>
          <View style={styles.presetRow}>
            {([
              { key: 'full', label: 'Show it' },
              { key: 'generic', label: 'Keep it private' },
            ] as const).map((opt) => {
              const active = (prefs?.notification_preview ?? 'full') === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { haptics.tap(); savePref({ notification_preview: opt.key }); }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.preset, { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accent : 'transparent' }]}
                >
                  <Text variant="label" color={active ? colors.bg : colors.ink2}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text color={colors.muted} style={styles.previewHint}>
            {(prefs?.notification_preview ?? 'full') === 'full'
              ? `"${partnerFirstName} just wrote theirs"`
              : '"Something is waiting for you in Pamwe"'}
          </Text>
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
          {/* Stopping for a while belongs beside the rhythm, not beside Delete
              account. It is a break, not an ending. */}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ActionRow label="Pause Pamwe" onPress={() => router.push('/(tabs)/you/pause')} colors={colors} />
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
  flex: { flex: 1, minWidth: 0 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  previewHint: { fontSize: 13, marginTop: 12, fontStyle: 'italic' },
  customTime: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, alignSelf: 'flex-start' },
  customTimeLabel: { fontSize: 12.5 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  divider: { height: 1, marginVertical: 16 },
  cadenceBlurb: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, paddingRight: 16 },
  toggleDesc: { marginTop: 4, lineHeight: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
});
