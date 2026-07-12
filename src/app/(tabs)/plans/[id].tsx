import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { CaretLeft, CaretRight, CheckCircle, BookOpen, Flower } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { StripedBanner } from '../../../components/ui/StripedBanner';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { overlayIn } from '../../../lib/motion';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getPlan, getPlanCached, getPlanDayList, enrollInPlan, switchPlan, completePlan } from '../../../lib/plans';
import { bannerTintForPlan } from '../../../lib/planArtwork';
import { parseReference } from '../../../lib/bible';
import { haptics } from '../../../lib/haptics';

const WINDOW = 40;

export default function PlanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { couple, couplePlan, refresh: refreshCouple } = useCouple();

  const [plan, setPlan] = useState<any | null>(null);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isActive = !!couplePlan && couplePlan.plan_id === id;
  const dayNow = isActive ? (couplePlan.current_day ?? 1) : 1;
  // Schedule window starts a little before the couple's current day; only this
  // window is fetched (M'Cheyne would otherwise ship 365 rows for 40 rendered).
  const windowFrom = Math.max(1, dayNow - 5);

  useEffect(() => {
    let alive = true;
    // Header paints instantly from the last-seen cached row on cold launch;
    // getPlan revalidates. The schedule query runs independently.
    getPlanCached(id).then((p) => {
      if (!alive || !p) return;
      setPlan((prev: any) => prev ?? p);
      setLoading(false);
    });
    getPlan(id)
      .then((p) => { if (alive) setPlan(p); })
      .catch(() => { if (alive) setPlan((prev: any) => prev ?? null); })
      .finally(() => { if (alive) setLoading(false); });
    getPlanDayList(id, windowFrom, WINDOW)
      .then((d) => { if (alive) setDays(d); })
      .catch(() => { /* schedule section simply stays hidden */ });
    return () => { alive = false; };
  }, [id, windowFrom]);

  const openReading = useCallback((ref: string, dayNumber: number) => {
    const parsed = parseReference(ref);
    if (!parsed) return;
    haptics.tap();
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: {
        book: parsed.book.name,
        chapter: String(parsed.chapter ?? 1),
        ...(isActive && couplePlan
          ? { couplePlanId: couplePlan.id, day: String(dayNumber), planTitle: plan?.title ?? '' }
          : {}),
      },
    });
  }, [router, isActive, couplePlan, plan?.title]);

  const onPrimary = async () => {
    if (!couple?.id || !plan) return;
    if (isActive) {
      haptics.tap();
      router.push('/(tabs)/(today)');
      return;
    }
    const begin = async () => {
      try {
        setBusy(true);
        if (couplePlan) {
          await switchPlan(couple.id, plan.id);
        } else {
          await enrollInPlan(couple.id, plan.id);
        }
        await refreshCouple();
        haptics.success();
        router.replace('/(tabs)/(today)');
      } catch (err: any) {
        setBusy(false);
        Alert.alert("Couldn't start this plan", err?.message ?? 'Try again in a moment.');
      }
    };
    if (couplePlan) {
      Alert.alert(
        'Switch reading plan?',
        `Your current plan is marked complete. "${plan.title}" starts at day 1, for both of you.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Begin together', style: 'destructive', onPress: begin },
        ],
      );
    } else {
      begin();
    }
  };

  const onMarkComplete = () => {
    if (!couplePlan) return;
    Alert.alert(
      'Mark this plan complete?',
      'It moves to your finished plans and you can choose what to read next.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark complete',
          onPress: async () => {
            try {
              setBusy(true);
              const cpId = couplePlan.id;
              await completePlan(cpId);
              await refreshCouple();
              haptics.success();
              // Manual completion earns the same celebration as finishing the
              // final day; the params carry the just-completed plan since it
              // is no longer the active one.
              router.replace({
                pathname: '/(tabs)/(today)/complete',
                params: { title: plan?.title ?? '', days: String(plan?.duration_days ?? ''), cpId },
              });
            } catch (err: any) {
              setBusy(false);
              Alert.alert("Couldn't update the plan", err?.message ?? 'Try again in a moment.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 40 }]}>
        <View style={styles.centerPad}>
          <Text variant="h2" italic style={styles.centerText}>We couldn't open this plan</Text>
          <View style={styles.centerCta}>
            <Button title="Go back" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  // `days` is already the fetched window; the earlier/more counts come from
  // the plan's total, not from fetched rows.
  const windowDays = days;
  const totalDays = plan.duration_days ?? (windowFrom - 1 + days.length);
  const earlierDays = windowFrom - 1;
  const moreDays = Math.max(0, totalDays - earlierDays - windowDays.length);
  const explore: string[] = plan.explore ?? [];
  const gain: string[] = plan.gain ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.View entering={overlayIn} style={styles.flex}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <StripedBanner height={216} stripe={7} tint={bannerTintForPlan(plan)}>
            <Floral variant="corner" style={styles.bannerFloral} />
            <View style={styles.bannerLabel}>
              <Text variant="eyebrow" color={colors.accent2} style={styles.tagline}>{plan.tagline ?? ''}</Text>
              <Text style={[styles.bannerTitle, { color: colors.ink }]}>{plan.title}</Text>
            </View>
          </StripedBanner>

          <TouchableOpacity
            onPress={() => { haptics.tap(); router.back(); }}
            style={[styles.back, { top: insets.top + 12, backgroundColor: colors.bgOverlay }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <CaretLeft size={17} color={colors.accent} weight="bold" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={[styles.metaRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.metaCol, { borderRightColor: colors.line2, borderRightWidth: 1 }]}>
                <Text style={[styles.metaBig, { color: colors.accent }]}>{plan.duration_days}</Text>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Days</Text>
              </View>
              <View style={[styles.metaColWide, { borderRightColor: colors.line2, borderRightWidth: 1 }]}>
                <Text style={[styles.metaMid, { color: colors.accent }]}>{plan.book_label ?? '·'}</Text>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>Scripture</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaMid, { color: colors.accent }]}>{plan.minutes_label ?? '·'}</Text>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>A day</Text>
              </View>
            </View>

            <Text variant="eyebrow" color={colors.muted} style={styles.section}>About this plan</Text>
            <Text style={[styles.about, { color: colors.ink }]}>{plan.about ?? plan.subtitle ?? ''}</Text>

            {days.length > 0 && (
              <>
                <Text variant="eyebrow" color={colors.muted} style={styles.section}>Reading schedule</Text>
                <View style={[styles.schedule, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  {earlierDays > 0 && (
                    <Text style={[styles.moreDays, { color: colors.muted }]}>{earlierDays} earlier days</Text>
                  )}
                  {windowDays.map((d) => {
                    const done = isActive && d.day_number < dayNow;
                    const current = d.day_number === dayNow;
                    const iconColor = done ? colors.accent : current ? colors.accent2 : colors.line;
                    const titleColor = done || current ? colors.accent : colors.ink;
                    return (
                      <TouchableOpacity
                        key={d.day_number}
                        activeOpacity={0.75}
                        onPress={() => openReading(d.passage_reference, d.day_number)}
                        style={[styles.dayRow, { borderBottomColor: colors.line2 }]}
                      >
                        {done ? (
                          <CheckCircle size={19} color={iconColor} weight="fill" />
                        ) : current ? (
                          <BookOpen size={19} color={iconColor} weight="fill" />
                        ) : (
                          <View style={[styles.upcomingDot, { borderColor: colors.line }]} />
                        )}
                        <View style={styles.flex}>
                          <Text style={[styles.dayLabel, { color: colors.muted }]}>Day {d.day_number}</Text>
                          <Text style={[styles.dayRef, { color: titleColor }]}>{d.passage_reference}</Text>
                        </View>
                        <CaretRight size={14} color={colors.muted} weight="regular" />
                      </TouchableOpacity>
                    );
                  })}
                  {moreDays > 0 && (
                    <Text style={[styles.moreDays, { color: colors.muted }]}>+ {moreDays} more days</Text>
                  )}
                </View>
              </>
            )}

            {explore.length > 0 && (
              <>
                <Text variant="eyebrow" color={colors.muted} style={styles.section}>What you'll explore</Text>
                <View style={styles.exploreList}>
                  {explore.map((text, i) => (
                    <View key={i} style={styles.exploreRow}>
                      <View style={[styles.exploreNum, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                        <Text style={[styles.exploreNumText, { color: colors.accent }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.exploreText, { color: colors.ink }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {gain.length > 0 && (
              <View style={[styles.gainCard, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                <Text variant="eyebrow" color={colors.accent2}>What you'll gain</Text>
                <View style={styles.gainList}>
                  {gain.map((text, i) => (
                    <View key={i} style={styles.gainRow}>
                      <Flower size={16} color={colors.accent2} weight="fill" style={styles.gainIcon} />
                      <Text style={[styles.gainText, { color: colors.ink }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.bg, paddingBottom: 14 }]}>
          {/* Tab bar is docked below the content area, so the CTA only needs its own breathing room. */}
          <Button title={isActive ? 'Continue reading' : 'Begin together'} onPress={onPrimary} loading={busy} />
          {isActive && (
            <TouchableOpacity onPress={onMarkComplete} disabled={busy} style={styles.markComplete} hitSlop={8}>
              <Text variant="chip" color={colors.accent2} style={styles.markCompleteText}>Mark plan complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerPad: { paddingHorizontal: GUTTER, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  centerCta: { marginTop: 20, alignSelf: 'stretch' },
  bannerFloral: { position: 'absolute', top: 44, right: -14, width: 118, height: 118, opacity: 0.82 },
  bannerLabel: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: GUTTER, paddingBottom: 20 },
  tagline: { letterSpacing: 2 },
  bannerTitle: { fontFamily: fonts.serifLight, fontSize: 30, lineHeight: 32, marginTop: 5 },
  back: {
    position: 'absolute', left: 22, width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: GUTTER, paddingTop: 22 },
  metaRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 16 },
  metaCol: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  metaColWide: { flex: 1.5, alignItems: 'center', paddingHorizontal: 8 },
  metaBig: { fontFamily: fonts.serif, fontSize: 20 },
  metaMid: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 17, textAlign: 'center' },
  metaLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 3 },
  section: { marginTop: 24 },
  about: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, marginTop: 10 },
  schedule: { marginTop: 12, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1 },
  upcomingDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.6, marginHorizontal: 1.5 },
  dayLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  dayRef: { fontFamily: fonts.serifMedium, fontSize: 15, marginTop: 1 },
  moreDays: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 13 },
  exploreList: { marginTop: 12, gap: 10 },
  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  exploreNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  exploreNumText: { fontFamily: fonts.serifMedium, fontSize: 12 },
  exploreText: { flex: 1, fontFamily: fonts.sans, fontSize: 15 },
  gainCard: { marginTop: 24, borderWidth: 1, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18 },
  gainList: { marginTop: 12, gap: 11 },
  gainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gainIcon: { marginTop: 2 },
  gainText: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12 },
  markComplete: { alignItems: 'center', marginTop: 10 },
  markCompleteText: { fontSize: 11, letterSpacing: 0.7 },
});
