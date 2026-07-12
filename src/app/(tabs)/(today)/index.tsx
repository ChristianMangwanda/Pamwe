import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GearSix } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StreakBar } from '../../../components/ui/StreakBar';
import { StreakTree } from '../../../components/ui/StreakTree';
import { MilestoneCard } from '../../../components/MilestoneCard';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useAuth } from '../../../providers/AuthProvider';
import { profileInitial } from '../../../lib/couples';
import { parseReference } from '../../../lib/bible';
import { daysBehind, todayInTimezone } from '../../../lib/catchup';
import { nudgePartner } from '../../../lib/notifications';
import { milestoneFor, Milestone } from '../../../lib/milestones';
import { haptics } from '../../../lib/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner, couplePlan, refresh: refreshCouple } = useCouple();
  const { loading, planDay, myEntry, partnerEntry, dayNumber, refresh } = useTodayEntry();
  const [refreshing, setRefreshing] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  // Celebrate a streak milestone once: an AsyncStorage high-water mark per
  // couple decides whether this one has already had its moment.
  const streakNow = couple?.streak_count ?? 0;
  useEffect(() => {
    if (!couple?.id) return;
    const m = milestoneFor(streakNow);
    if (!m) return;
    AsyncStorage.getItem(`pamwe:milestoneSeen:${couple.id}`)
      .then((v) => { if (Number(v ?? 0) < m) setMilestone(m); })
      .catch(() => {});
  }, [couple?.id, streakNow]);

  const dismissMilestone = () => {
    if (couple?.id && milestone) {
      AsyncStorage.setItem(`pamwe:milestoneSeen:${couple.id}`, String(milestone)).catch(() => {});
    }
    setMilestone(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshCouple()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!couplePlan || !planDay) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text variant="h2" italic style={styles.centerTitle}>Ready for what's next</Text>
          <Text color={colors.ink2} style={styles.centerText}>
            You don't have an active reading plan right now. Choose one and begin together.
          </Text>
          <View style={styles.centerCta}>
            <Button title="Choose a plan" onPress={() => router.push('/(onboarding)/plan-select')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const planTitle = couplePlan.plan?.title ?? "M'Cheyne Reading Plan";
  const totalDays = couplePlan.plan?.duration_days ?? 365;
  const mySubmitted = !!myEntry?.submitted_at;
  const partnerSubmitted = !!partnerEntry?.submitted_at;
  const bothSubmitted = mySubmitted && partnerSubmitted;

  const myInitial = (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase() ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? '?';
  const partnerName = partner?.display_name ?? 'Your partner';
  const myStatus = mySubmitted ? 'Done' : 'Today';
  const partnerStatus = partnerSubmitted ? 'Done' : 'Reading…';

  const streakCount = couple?.streak_count ?? 0;
  const progress = totalDays > 0 ? (dayNumber - 1) / totalDays : 0;

  // Gentle catch-up: how many days behind the couple's own start-date pace they
  // are. Server owns advancement; this only decides whether to nudge.
  const behind = couplePlan?.start_date
    ? daysBehind(couplePlan.start_date, dayNumber, todayInTimezone(couple?.timezone ?? 'UTC'), totalDays)
    : 0;

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

  const verse = planDay.pull_quote ?? planDay.passage_reference;
  const verseRef = planDay.pull_quote_ref ?? planDay.passage_reference;

  // "Read Day N" opens the Bible reader with plan context (banner + Reflect
  // button into the journal), same as plan-detail rows. Beta feedback: the
  // standalone reading page read as a slow mystery screen. reading.tsx stays
  // as the fallback for references the parser can't place.
  const openReading = () => {
    const parsed = parseReference(planDay.passage_reference ?? '');
    if (!parsed) {
      router.push('/(tabs)/(today)/reading');
      return;
    }
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: {
        book: parsed.book.name,
        chapter: String(parsed.chapter ?? 1),
        couplePlanId: couplePlan.id,
        day: String(dayNumber),
        planTitle,
      },
    });
  };

  const cta = bothSubmitted
    ? { label: 'Reveal together', go: () => router.push('/(tabs)/(today)/reveal') }
    : mySubmitted
    ? { label: `Waiting for ${partnerName}`, go: () => router.push('/(tabs)/(today)/waiting') }
    : { label: `Read Day ${dayNumber}`, go: openReading };

  const onCta = () => { haptics.tap(); cta.go(); };

  // Offer a nudge only while I've read and I'm waiting on my partner.
  const canNudge = mySubmitted && !partnerSubmitted;
  const onNudge = async () => {
    if (nudging || nudged) return;
    haptics.medium();
    setNudging(true);
    const res = await nudgePartner();
    setNudging(false);
    if (res.ok) { setNudged(true); haptics.success(); }
    else if (res.cooldown) { setNudged(true); Alert.alert('Already sent', res.message ?? 'You just sent a nudge.'); }
    else Alert.alert("Couldn't send the nudge", res.message ?? 'Try again in a moment.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Floral variant="corner" style={styles.floral} />

        <View style={styles.gearRow}>
          <TouchableOpacity
            onPress={() => { haptics.tap(); router.push('/(tabs)/you/settings'); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <GearSix size={21} color={colors.ink2} weight="regular" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <SectionEyebrow style={styles.dateLabel}>{dateLabel}</SectionEyebrow>
          <Text style={[styles.dayNum, { color: colors.ink }]}>Day {dayNumber}</Text>
          <Text italic color={colors.ink2} style={styles.planTitle}>{planTitle}</Text>
        </View>

        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} />
          <View style={styles.progressRow}>
            <Text variant="eyebrow" color={colors.muted}>Day {dayNumber}</Text>
            <Text variant="eyebrow" color={colors.muted}>{totalDays} days</Text>
          </View>
        </View>

        {behind > 0 && !bothSubmitted && (
          <View style={[styles.catchup, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
            <Text style={[styles.catchupText, { color: colors.ink }]}>
              {behind === 1
                ? "You're a day behind. That's okay. Pick it back up together when you can."
                : `You're ${behind} days behind. That's okay. Read today's together and you'll be back in step.`}
            </Text>
          </View>
        )}

        <View style={[styles.verseCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.quoteGlyph, { color: colors.accent }]}>“</Text>
          <Text style={[styles.verse, { color: colors.ink }]}>{verse}</Text>
          <Floral variant="divider" style={styles.verseDivider} />
          <Text style={[styles.verseRef, { color: colors.ink2 }]}>{verseRef}</Text>
        </View>

        <View style={styles.partnerRow}>
          <PartnerCol initial={myInitial} name="You" status={myStatus} solid />
          <Floral variant="divider" style={styles.partnerDivider} />
          <PartnerCol initial={partnerInitial} name={partnerName} status={partnerStatus} solid={partnerSubmitted} />
        </View>

        <View style={styles.streakWrap}>
          <StreakTree count={streakCount} />
          <StreakBar count={streakCount} />
          {streakCount > 0 && (
            <Text style={[styles.streakCount, { color: colors.muted }]}>{streakCount} day streak</Text>
          )}
        </View>

        {milestone && <MilestoneCard milestone={milestone} onDismiss={dismissMilestone} />}

        <View style={styles.ctaWrap}>
          <Button title={cta.label} onPress={onCta} />
          {canNudge && (
            <TouchableOpacity onPress={onNudge} disabled={nudging || nudged} activeOpacity={0.7}
              style={styles.nudge} accessibilityRole="button" accessibilityLabel={`Nudge ${partnerName}`}>
              <Text variant="chip" color={nudged ? colors.muted : colors.accent2} style={styles.nudgeText}>
                {nudged ? `${partnerName} has been nudged` : nudging ? 'Sending…' : `Nudge ${partnerName} gently`}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.readingRef, { color: colors.ink2 }]}>
            Today's reading · <Text style={{ color: colors.accent }}>{planDay.passage_reference}</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PartnerCol({ initial, name, status, solid }: { initial: string; name: string; status: string; solid: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.partnerCol}>
      <View style={[styles.avatar, { borderColor: colors.accent2, borderStyle: solid ? 'solid' : 'dashed' }]}>
        <Text style={[styles.avatarInitial, { color: colors.accent }]}>{initial}</Text>
      </View>
      <Text style={[styles.partnerName, { color: colors.ink }]} numberOfLines={1}>{name}</Text>
      <Text style={[styles.partnerStatus, { color: colors.muted }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  centerTitle: { textAlign: 'center' },
  centerText: { fontSize: 15, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  centerCta: { marginTop: 28, alignSelf: 'stretch' },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  floral: { position: 'absolute', top: -6, left: -16, width: 116, height: 116, opacity: 0.82 },
  gearRow: { flexDirection: 'row', justifyContent: 'flex-end', zIndex: 2 },
  header: { alignItems: 'center', marginTop: 4 },
  dateLabel: { letterSpacing: 2.2 },
  dayNum: { fontFamily: fonts.serifLight, fontSize: 34, lineHeight: 36, marginTop: 6 },
  planTitle: { fontSize: 14, marginTop: 3 },
  progressWrap: { marginTop: 18 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  catchup: { marginTop: 16, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  catchupText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  verseCard: {
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 22,
    paddingHorizontal: 26,
  },
  quoteGlyph: { position: 'absolute', top: 6, left: 20, fontFamily: fonts.serif, fontSize: 54, opacity: 0.2 },
  verse: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, textAlign: 'center', marginTop: 6 },
  verseDivider: { width: 150, height: 26, alignSelf: 'center', marginTop: 14, opacity: 0.92 },
  verseRef: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', textAlign: 'center', marginTop: 12 },
  partnerRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  partnerCol: { width: 76, alignItems: 'center', gap: 7 },
  partnerDivider: { flex: 1, height: 26, marginHorizontal: 4, marginBottom: 24, opacity: 0.95 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 20 },
  partnerName: { fontFamily: fonts.sansMedium, fontSize: 12 },
  partnerStatus: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  streakWrap: { marginTop: 18, alignItems: 'center', gap: 8 },
  streakCount: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase' },
  ctaWrap: { marginTop: 22 },
  nudge: { alignItems: 'center', marginTop: 14 },
  nudgeText: { fontSize: 11, letterSpacing: 0.8 },
  readingRef: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
