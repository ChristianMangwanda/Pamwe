import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { MagnifyingGlass, ArrowRight, CaretRight, Plus, Flower, CheckCircle, Sparkle } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { StripedBanner } from '../../../components/ui/StripedBanner';
import { AskPamweSheet } from '../../../components/AskPamweSheet';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getCuratedPlans, getCouplePlans, getCompletedCouplePlans } from '../../../lib/plans';
import { bannerTintForPlan } from '../../../lib/planArtwork';
import { haptics } from '../../../lib/haptics';

const PLANS_CACHE_KEY = 'pamwe:plansBrowse';

export default function PlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan } = useCouple();
  const [curated, setCurated] = useState<any[]>([]);
  const [myPlans, setMyPlans] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  // Stale-while-revalidate: render the last-seen browse grid instantly on a
  // cold launch while the network load below refreshes it.
  useEffect(() => {
    AsyncStorage.getItem(PLANS_CACHE_KEY)
      .then((v) => {
        if (!v) return;
        setCurated((prev) => (prev.length ? prev : JSON.parse(v)));
        setLoading(false);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [c, mine, done] = await Promise.all([
        getCuratedPlans(),
        couple?.id ? getCouplePlans(couple.id) : Promise.resolve([]),
        couple?.id ? getCompletedCouplePlans(couple.id) : Promise.resolve([]),
      ]);
      setCurated(c);
      setMyPlans(mine);
      setCompleted(done);
      AsyncStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(c)).catch(() => {});
    } catch {
      // Leave lists as-is; pull-to-refresh can retry.
    } finally {
      setLoading(false);
    }
  }, [couple?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (id: string) => { haptics.tap(); router.push({ pathname: '/(tabs)/plans/[id]', params: { id } }); };

  const activePlan = couplePlan?.plan;
  const currentDay = couplePlan?.current_day ?? 1;
  const activeTotal = activePlan?.duration_days ?? 1;
  const activePct = Math.max(0, Math.min(1, (currentDay - 1) / activeTotal));

  // One row per finished plan (a plan can be completed twice), newest first,
  // and never the plan that's being read right now.
  const seenPlanIds = new Set<string>();
  const completedPlans = completed.filter((cp) => {
    if (!cp.plan || cp.plan_id === activePlan?.id || seenPlanIds.has(cp.plan_id)) return false;
    seenPlanIds.add(cp.plan_id);
    return true;
  });

  const metaLine = (p: any) => `${p.book_label ?? p.title} · ${p.duration_days} days`;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <View style={styles.titleRow}>
        <Text variant="h1">Plans</Text>
        <TouchableOpacity onPress={() => { haptics.tap(); setAskOpen(true); }} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Ask Pamwe">
          <MagnifyingGlass size={20} color={colors.ink2} weight="regular" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => { haptics.tap(); setAskOpen(true); }}
        style={[styles.askCard, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
        <View style={[styles.askIcon, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}>
          <Sparkle size={17} color={colors.accent2} weight="fill" />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.askTitle, { color: colors.ink }]}>Not sure what to read next?</Text>
          <Text style={[styles.askSub, { color: colors.muted }]}>Ask Pamwe for a passage or a plan.</Text>
        </View>
        <ArrowRight size={15} color={colors.accent2} weight="bold" />
      </TouchableOpacity>

      {activePlan && (
        <>
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Reading now</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => open(activePlan.id)}
            style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <StripedBanner height={92} stripe={6} tint={bannerTintForPlan(activePlan)}>
              <View style={styles.heroBannerLabel}>
                <Text variant="scripture" italic color={colors.accent}>{activePlan.title}</Text>
              </View>
            </StripedBanner>
            <View style={styles.heroBody}>
              <View style={[styles.track, { backgroundColor: colors.line2 }]}>
                <View style={[styles.fill, { width: `${activePct * 100}%`, backgroundColor: colors.accent }]} />
              </View>
              <View style={styles.heroFoot}>
                <Text variant="eyebrow" color={colors.muted} style={styles.heroDay}>Day {currentDay} of {activeTotal}</Text>
                <View style={styles.viewPlan}>
                  <Text variant="chip" color={colors.accent} style={styles.viewPlanText}>View plan</Text>
                  <ArrowRight size={13} color={colors.accent} weight="bold" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}

      {myPlans.length > 0 && (
        <>
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Your plans</Text>
          <View style={styles.myList}>
            {myPlans.map((p) => (
              <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => open(p.id)}
                style={[styles.myRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={[styles.myIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                  <Flower size={20} color={colors.accent2} weight="fill" />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.myTitle, { color: colors.ink }]}>{p.title}</Text>
                  <Text style={[styles.myMeta, { color: colors.muted }]}>{metaLine(p)}</Text>
                </View>
                <CaretRight size={15} color={colors.accent2} weight="regular" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {completedPlans.length > 0 && (
        <>
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Completed</Text>
          <View style={styles.myList}>
            {completedPlans.map((cp) => (
              <TouchableOpacity key={cp.id} activeOpacity={0.85} onPress={() => open(cp.plan.id)}
                style={[styles.myRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={[styles.myIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                  <CheckCircle size={20} color={colors.accent2} weight="fill" />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.myTitle, { color: colors.ink }]}>{cp.plan.title}</Text>
                  <Text style={[styles.myMeta, { color: colors.muted }]}>Completed · {cp.plan.duration_days} days · tap to begin again</Text>
                </View>
                <CaretRight size={15} color={colors.accent2} weight="regular" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Browse more</Text>
      <View style={styles.grid}>
        {curated.map((p) => (
          <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => open(p.id)}
            style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <StripedBanner height={64} stripe={6} tint={bannerTintForPlan(p)} />
            <View style={styles.gridBody}>
              <Text style={[styles.gridTitle, { color: colors.ink }]} numberOfLines={2}>{p.title}</Text>
              <Text style={[styles.gridMeta, { color: colors.muted }]}>{metaLine(p)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.85}
        onPress={() => { haptics.tap(); router.push('/(tabs)/plans/builder'); }}
        style={[styles.buildBtn, { borderColor: colors.accent2 }]}>
        <Plus size={16} color={colors.accent} weight="bold" />
        <Text variant="chip" color={colors.accent} style={styles.buildText}>Build your own plan</Text>
      </TouchableOpacity>

      <AskPamweSheet visible={askOpen} onClose={() => setAskOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  askCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  askIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  askTitle: { fontFamily: fonts.serifMedium, fontSize: 15 },
  askSub: { fontFamily: fonts.sans, fontSize: 11, marginTop: 2 },
  eyebrow: { marginTop: 22 },
  hero: { marginTop: 10, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  heroBannerLabel: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  heroBody: { padding: 14, paddingBottom: 16 },
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  heroDay: { letterSpacing: 1.4 },
  viewPlan: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewPlanText: { fontSize: 11, letterSpacing: 0.6 },
  myList: { marginTop: 10, gap: 10 },
  myRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 14, padding: 14 },
  myIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  myTitle: { fontFamily: fonts.serifMedium, fontSize: 15 },
  myMeta: { fontFamily: fonts.sans, fontSize: 10, marginTop: 2 },
  grid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  gridCard: { width: '48%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  gridBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  gridTitle: { fontFamily: fonts.serifMedium, fontSize: 14 },
  gridMeta: { fontFamily: fonts.sans, fontSize: 10, marginTop: 3 },
  buildBtn: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16,
  },
  buildText: { fontSize: 11, letterSpacing: 1 },
});
