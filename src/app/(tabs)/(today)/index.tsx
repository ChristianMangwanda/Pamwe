import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { GearSix, BellSimple } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Button } from '../../../components/ui/Button';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { StreakBar } from '../../../components/ui/StreakBar';
import { ThinkingButton } from '../../../components/ThinkingButton';
import { DayClosed } from '../../../components/DayClosed';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useAuth } from '../../../providers/AuthProvider';
import { profileInitial } from '../../../lib/couples';
import { parseReference } from '../../../lib/bible';
import { getPlanDay } from '../../../lib/plans';
import { daysBehind, todayInTimezone, canOpenDay, opensOn, opensLabel } from '../../../lib/catchup';
import { nudgePartner } from '../../../lib/notifications';
import { lastFinishedPlan, FinishedPlan } from '../../../lib/planHistory';
import { getUnseenReveals } from '../../../lib/entries';
import { unreadActivityCount } from '../../../lib/activity';
import { haptics } from '../../../lib/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner, me, couplePlan, refresh: refreshCouple } = useCouple();
  const { loading, error, planDay, myEntry, partnerEntry, dayNumber, refresh } = useTodayEntry();
  const [refreshing, setRefreshing] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  // Only read when there's no active plan, to tell "you finished something"
  // apart from "you never started".
  const [finished, setFinished] = useState<FinishedPlan | null>(null);

  // The cadence gate, and the verse the closed day holds. Both live up here
  // with the other hooks because there are early returns below, and a hook
  // placed after one of those changes the hook count between renders.
  //
  // The day's reading is done and the next has not come round yet. Being AHEAD
  // of your own rhythm is the only thing that closes the day: behind it, every
  // day up to today stays open, so catching up still works exactly as before.
  const todayISO = todayInTimezone(couple?.timezone ?? 'UTC');
  const cadence = couplePlan?.cadence_days ?? 1;
  const totalDays = couplePlan?.plan?.duration_days ?? 365;
  const closed = dayNumber > 1
    && !canOpenDay(dayNumber, couplePlan?.start_date, todayISO, totalDays, cadence);

  // The verse held on a closed day is the one just SEALED, never the one still
  // shut: showing tomorrow's pull quote here would be the reading-ahead this
  // gate exists to stop.
  const [sealedDay, setSealedDay] = useState<any | null>(null);
  const planIdForDays = couplePlan?.plan?.id ?? couplePlan?.plan_id ?? null;
  useEffect(() => {
    if (!closed || !planIdForDays) { setSealedDay(null); return; }
    let alive = true;
    getPlanDay(planIdForDays, dayNumber - 1)
      .then((pd) => { if (alive) setSealedDay(pd); })
      .catch(() => {});
    return () => { alive = false; };
  }, [closed, planIdForDays, dayNumber]);

  useEffect(() => {
    if (!couple?.id || couplePlan) { setFinished(null); return; }
    lastFinishedPlan(couple.id).then(setFinished).catch(() => {});
  }, [couple?.id, couplePlan]);

  // A reveal the OTHER partner already amened past. The day advances on either
  // partner's Amen, so whoever did not tap it can land on a fresh day having
  // never seen the last one, and until this card there was nothing on Today
  // that said so. Re-read on focus, so watching one clears it on the way back.
  const [unseenReveal, setUnseenReveal] = useState<number | null>(null);
  const couplePlanId = couplePlan?.id ?? null;
  useFocusEffect(
    useCallback(() => {
      if (!couplePlanId || dayNumber <= 1) { setUnseenReveal(null); return; }
      let alive = true;
      getUnseenReveals(couplePlanId, dayNumber)
        .then((days) => { if (alive) setUnseenReveal(days[0] ?? null); })
        .catch(() => {});
      return () => { alive = false; };
    }, [couplePlanId, dayNumber]),
  );

  // The bell's dot. Re-read on focus so it clears on the way back from the
  // list, and stays quiet (0) whenever the count cannot be fetched: a dot that
  // appears because the network blipped would train people to ignore it.
  const [unread, setUnread] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      unreadActivityCount()
        .then((n) => { if (alive) setUnread(n); })
        .catch(() => { if (alive) setUnread(0); });
      return () => { alive = false; };
    }, []),
  );

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
          <PamweLoading />
        </View>
      </SafeAreaView>
    );
  }

  // A plan we could not READ is not a plan you do not have. Both used to land
  // on the empty state below, so a cache miss on a train told a couple three
  // months into M'Cheyne to go and choose their first plan.
  if (couplePlan && !planDay && error) {
    const missing = error === 'missing-day';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text variant="h2" italic style={styles.centerTitle}>
            {missing ? "This day isn't there" : "Couldn't load today"}
          </Text>
          <Text color={colors.ink2} style={styles.centerText}>
            {missing
              ? 'Your plan has no reading for this day. Your reflections are all still here.'
              : 'Your plan and your words are safe. Check your connection and try again.'}
          </Text>
          <View style={styles.centerCta}>
            {missing ? (
              <Button title="Go to your plans" onPress={() => router.push('/(tabs)/plans')} />
            ) : (
              <Button title="Try again" onPress={onRefresh} />
            )}
            <Button
              title="Read your reflections"
              variant="secondary"
              onPress={() => router.push('/(tabs)/reflect')}
              style={styles.centerCta2}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // No active plan. If they finished one, say so: this used to show the same
  // blank "you have no plan" state a brand new couple sees, so finishing a
  // plan read as the app having lost everything.
  if (!couplePlan || !planDay) {
    const finishedOn = finished?.finishedOn
      ? new Date(finished.finishedOn).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      : null;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Floral variant="divider" style={styles.doneFloral} />
          {finished ? (
            <>
              <Text variant="eyebrow" color={colors.accent2}>Plan complete</Text>
              <Text variant="h2" italic style={styles.centerTitle}>
                You finished {finished.title}, together
              </Text>
              <Text color={colors.ink2} style={styles.centerText}>
                {finished.durationDays} days{finishedOn ? `, finished on ${finishedOn}` : ''}. Every one of them is still
                in your reflections. Ready for what's next?
              </Text>
            </>
          ) : (
            <>
              <Text variant="h2" italic style={styles.centerTitle}>Ready for what's next</Text>
              <Text color={colors.ink2} style={styles.centerText}>
                You don't have an active reading plan right now. Choose one and begin together.
              </Text>
            </>
          )}
          <View style={styles.centerCta}>
            <Button title="Pick your next plan" onPress={() => router.push('/(onboarding)/plan-select')} />
            <Button
              title="Build your own"
              variant="secondary"
              onPress={() => router.push('/(tabs)/plans/builder', { withAnchor: true })}
              style={styles.centerCta2}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const planTitle = couplePlan.plan?.title ?? "M'Cheyne Reading Plan";
  const mySubmitted = !!myEntry?.submitted_at;
  const partnerSubmitted = !!partnerEntry?.submitted_at;
  const bothSubmitted = mySubmitted && partnerSubmitted;

  const myInitial = me?.avatar_initial
    ?? (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase()
    ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? '?';
  const partnerName = partner?.display_name ?? 'Your partner';
  const myStatus = mySubmitted ? 'Done' : 'Today';
  const partnerStatus = partnerSubmitted ? 'Done' : 'Reading…';

  const streakCount = couple?.streak_count ?? 0;
  const progress = totalDays > 0 ? (dayNumber - 1) / totalDays : 0;

  // Gentle catch-up: how many days behind the couple's own start-date pace they
  // are, measured against their chosen cadence so a slower rhythm is never
  // reported as late. Server owns advancement; this only decides whether to nudge.
  const behind = couplePlan?.start_date
    ? daysBehind(couplePlan.start_date, dayNumber, todayISO, totalDays, cadence)
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
      router.push({ pathname: '/(tabs)/(today)/reading', params: { day: String(dayNumber) } });
      return;
    }
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: {
        book: parsed.book.name,
        chapter: String(parsed.chapter ?? 1),
        // A day that names a passage rather than a chapter opens on that
        // passage. The rest of the chapter is a tap away in the reader.
        ...(parsed.verse ? { verse: String(parsed.verse) } : {}),
        ...(parsed.endVerse ? { to: String(parsed.endVerse) } : {}),
        couplePlanId: couplePlan.id,
        day: String(dayNumber),
        planTitle,
      },
    }, { withAnchor: true });
  };

  const cta = bothSubmitted
    ? {
        label: 'Reveal together',
        go: () => router.push({ pathname: '/(tabs)/(today)/reveal', params: { day: String(dayNumber) } }),
      }
    : mySubmitted
    ? { label: `Waiting for ${partnerName}`, go: () => router.push({ pathname: '/(tabs)/(today)/waiting', params: { day: String(dayNumber) } }) }
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
    if (res.ok) {
      setNudged(true);
      haptics.success();
      // The nudge is logged either way, but say so plainly when no banner lands.
      if (!res.delivered) {
        Alert.alert('Nudge saved', `${partnerName} has notifications off, so it won't buzz their phone.`);
      }
    }
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
          {/* A dot, never a count. The point is that something is there, and a
              number turns a quiet record into a tally to clear. */}
          <TouchableOpacity
            onPress={() => { haptics.tap(); router.push('/(tabs)/(today)/activity'); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? 'Activity, new since you last looked' : 'Activity'}
            style={styles.bell}
          >
            <BellSimple size={21} color={colors.ink2} weight="regular" />
            {unread > 0 && <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.bg }]} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.tap(); router.push('/(tabs)/you/settings', { withAnchor: true }); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <GearSix size={21} color={colors.ink2} weight="regular" />
          </TouchableOpacity>
        </View>

        {closed ? (
          <DayClosed
            day={dayNumber - 1}
            verse={sealedDay?.pull_quote ?? sealedDay?.passage_reference ?? verseRef}
            verseRef={sealedDay?.pull_quote_ref ?? sealedDay?.passage_reference ?? ''}
            opens={couplePlan?.start_date
              ? opensLabel(opensOn(couplePlan.start_date, dayNumber, cadence), todayISO)
              : 'tomorrow morning'}
            streakCount={streakCount}
            onPrayers={() => router.push('/(tabs)/prayers')}
            onGrove={() => router.push('/(tabs)/you/grove', { withAnchor: true })}
            onReread={() => router.push({
              pathname: '/(tabs)/(today)/reveal',
              params: { day: String(dayNumber - 1) },
            })}
          />
        ) : (
        <>
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

        {/* Offered before anything about today: a moment you have not had yet
            should not sit under an invitation to move further past it. */}
        {unseenReveal !== null && (
          <TouchableOpacity
            onPress={() => {
              haptics.tap();
              router.push({ pathname: '/(tabs)/(today)/reveal', params: { day: String(unseenReveal) } });
            }}
            activeOpacity={0.85}
            style={[styles.unseen, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}
            accessibilityRole="button"
            accessibilityLabel={`Open the reveal for day ${unseenReveal}`}
          >
            <Text variant="eyebrow" color={colors.accent2}>Waiting for you</Text>
            <Text style={[styles.unseenText, { color: colors.ink }]}>
              {unseenReveal === dayNumber - 1
                ? `${partnerName} marked yesterday complete. You haven't read it together yet.`
                : `Day ${unseenReveal} was revealed and you haven't read it together yet.`}
            </Text>
            <Text variant="chip" color={colors.accent} style={styles.unseenCta}>
              Open day {unseenReveal}
            </Text>
          </TouchableOpacity>
        )}

        {/* The content below is the last good copy of it. Say the refresh
            failed without taking the day away. */}
        {error === 'network' && (
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.staleRow} accessibilityRole="button">
            <Text variant="chip" color={colors.muted} style={styles.staleText}>
              Couldn't refresh just now. Tap to try again.
            </Text>
          </TouchableOpacity>
        )}

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

        {/* The tree used to sit here above the streak bar, both telling the
            same story. It now marks finished plans, on the completion screen
            and in the You tab, where a rarer thing can mean more. */}
        <View style={styles.streakWrap}>
          <StreakBar count={streakCount} />
          {streakCount > 0 && (
            <Text style={[styles.streakCount, { color: colors.muted }]}>{streakCount} day streak</Text>
          )}
        </View>

        <View style={styles.ctaWrap}>
          {/* The heart sits beside the CTA rather than floating over it: a
              floating bubble covered "Read Day N" partway through a scroll. */}
          <View style={styles.ctaRow}>
            <ThinkingButton />
            <Button title={cta.label} onPress={onCta} style={styles.ctaButton} />
          </View>
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
        </>
        )}
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
  centerCta2: { marginTop: 10 },
  doneFloral: { width: 150, height: 26, marginBottom: 18, opacity: 0.85 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  floral: { position: 'absolute', top: -6, left: -16, width: 116, height: 116, opacity: 0.82 },
  gearRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, zIndex: 2 },
  bell: { position: 'relative' },
  dot: { position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5 },
  header: { alignItems: 'center', marginTop: 4 },
  dateLabel: { letterSpacing: 2.2 },
  dayNum: { fontFamily: fonts.serifLight, fontSize: 34, lineHeight: 36, marginTop: 6 },
  planTitle: { fontSize: 14, marginTop: 3 },
  progressWrap: { marginTop: 18 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  unseen: { marginTop: 18, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  unseenText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 },
  unseenCta: { fontSize: 11, letterSpacing: 0.8, marginTop: 2 },
  staleRow: { alignItems: 'center', marginTop: 14 },
  staleText: { fontSize: 11, letterSpacing: 0.6 },
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
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaButton: { flex: 1 },
  nudge: { alignItems: 'center', marginTop: 14 },
  nudgeText: { fontSize: 11, letterSpacing: 0.8 },
  readingRef: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
