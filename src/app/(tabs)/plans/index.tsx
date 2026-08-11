import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { MagnifyingGlass, ArrowRight, CaretRight, Flower, CheckCircle, Sparkle, SquaresFour, X } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { StripedBanner } from '../../../components/ui/StripedBanner';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import {
  getBrowsablePlans, getCouplePlans, getCompletedCouplePlans,
  getEnrolledPlanIds, searchPlans,
} from '../../../lib/plans';
import { isFinished } from '../../../lib/planHistory';
import { bannerTintForPlan } from '../../../lib/planArtwork';
import { haptics } from '../../../lib/haptics';

const PLANS_CACHE_KEY = 'pamwe:plansBrowse';

export default function PlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan } = useCouple();
  const [browsable, setBrowsable] = useState<any[]>([]);
  const [myPlans, setMyPlans] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  // Stale-while-revalidate: render the last-seen browse grid instantly on a
  // cold launch while the network load below refreshes it.
  useEffect(() => {
    AsyncStorage.getItem(PLANS_CACHE_KEY)
      .then((v) => {
        if (!v) return;
        setBrowsable((prev) => (prev.length ? prev : JSON.parse(v)));
        setLoading(false);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [b, mine, done, enrolled] = await Promise.all([
        getBrowsablePlans(),
        couple?.id ? getCouplePlans(couple.id) : Promise.resolve([]),
        couple?.id ? getCompletedCouplePlans(couple.id) : Promise.resolve([]),
        couple?.id ? getEnrolledPlanIds(couple.id) : Promise.resolve(new Set<string>()),
      ]);
      setBrowsable(b);
      setMyPlans(mine);
      setCompleted(done);
      setEnrolledIds(enrolled);
      AsyncStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(b)).catch(() => {});
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
  const build = (seed?: string) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/plans/build', params: seed ? { q: seed } : {} });
  };

  const activePlan = couplePlan?.plan;
  const currentDay = couplePlan?.current_day ?? 1;
  const activeTotal = activePlan?.duration_days ?? 1;
  const activePct = Math.max(0, Math.min(1, (currentDay - 1) / activeTotal));

  // One row per finished plan (a plan can be completed twice), newest first,
  // and never the plan that's being read right now. isFinished, not status
  // alone: enrollInPlan retires the outgoing plan on every switch, so status
  // counts abandonments too and this number ran ahead of the You tab's.
  const seenPlanIds = new Set<string>();
  const completedPlans = completed.filter((cp) => {
    if (!cp.plan || cp.plan_id === activePlan?.id || seenPlanIds.has(cp.plan_id)) return false;
    if (!isFinished(cp)) return false;
    seenPlanIds.add(cp.plan_id);
    return true;
  });

  // The door to plan history opens for anything retired that was actually
  // read, ended plans included, so a couple who stopped part way can still find
  // the days they did read. The count keeps naming only the plans finished to
  // the end, because that is what it says.
  const historyCount = completed.filter(
    (cp) => cp.plan && (isFinished(cp) || (cp.current_day ?? 1) > 1),
  ).length;

  // Started at least once vs built and set aside.
  const startedPlans = myPlans.filter((p) => enrolledIds.has(p.id));
  const savedPlans = myPlans.filter((p) => !enrolledIds.has(p.id));

  const searching = query.trim().length > 0;
  // Search runs over everything the couple could open, their own plans
  // included, since "that plan we built about waiting" is a thing people look
  // for. Chips only narrow the browse grid.
  const results = useMemo(
    () => searchPlans([...myPlans, ...browsable], query),
    [myPlans, browsable, query],
  );

  const metaLine = (p: any) => `${p.book_label ?? p.title} · ${p.duration_days} days`;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}><PamweLoading /></View>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <Text variant="h1" style={styles.title}>Plans</Text>

      {/* One field. It searches what you already have, and only offers to build
          when nothing fits, so the AI is the fallback rather than the front door. */}
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: query ? colors.accent : colors.line }]}>
        <MagnifyingGlass size={17} color={query ? colors.accent : colors.muted} weight="regular" />
        <TextInput
          style={[styles.searchInput, { color: colors.ink }]}
          placeholder="Search plans, a book, or a theme"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => { if (searching && results.length === 0) build(query); }}
          accessibilityLabel="Search plans"
        />
        {searching && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <X size={15} color={colors.muted} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <>
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            {results.length > 0 ? `${results.length} match${results.length === 1 ? '' : 'es'}` : 'Nothing saved matches that'}
          </Text>

          {results.map((p: any) => (
            <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => open(p.id)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                <Flower size={19} color={colors.accent2} weight="fill" />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={2}>{p.title}</Text>
                <Text style={[styles.rowMeta, { color: colors.muted }]}>{metaLine(p)}</Text>
              </View>
              <CaretRight size={15} color={colors.accent2} weight="regular" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity activeOpacity={0.85} onPress={() => build(query)}
            style={[styles.buildFromSearch, { backgroundColor: colors.accent }]}>
            <Sparkle size={16} color={colors.bg} weight="fill" />
            <View style={styles.flex}>
              <Text style={[styles.bfsTitle, { color: colors.bg }]} numberOfLines={2}>
                Build a plan about “{query.trim()}”
              </Text>
              <Text style={[styles.bfsSub, { color: colors.bg }]}>Pamwe shapes the readings for the two of you.</Text>
            </View>
            <ArrowRight size={15} color={colors.bg} weight="bold" />
          </TouchableOpacity>
        </>
      ) : (
        <>
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
                    <Text variant="eyebrow" color={colors.muted}>Day {currentDay} of {activeTotal}</Text>
                    <View style={styles.viewPlan}>
                      <Text variant="chip" color={colors.accent} style={styles.viewPlanText}>View plan</Text>
                      <ArrowRight size={13} color={colors.accent} weight="bold" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* Build and Browse share the top. Build used to be a thin outline
              button below the entire browse grid, which is the last place you
              look for the thing that makes this app different. */}
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Start something</Text>
          <View style={styles.doors}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => build()}
              style={[styles.door, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <View style={[styles.doorIcon, { backgroundColor: colors.accent2 }]}>
                <Sparkle size={17} color={colors.bg} weight="fill" />
              </View>
              <Text style={[styles.doorTitle, { color: colors.bg }]}>Build a plan</Text>
              <Text style={[styles.doorSub, { color: colors.bg }]}>
                Say what you are walking through. Pamwe shapes the readings.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={() => { haptics.tap(); router.push('/(tabs)/plans/browse'); }}
              style={[styles.door, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.doorIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent, borderWidth: 1 }]}>
                <SquaresFour size={17} color={colors.accent2} weight="regular" />
              </View>
              <Text style={[styles.doorTitle, { color: colors.ink }]}>Browse</Text>
              <Text style={[styles.doorSub, { color: colors.muted }]}>
                {browsable.length} plans by topic and length, and what other couples read.
              </Text>
            </TouchableOpacity>
          </View>

          {startedPlans.length > 0 && (
            <>
              <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Your plans</Text>
              {startedPlans.map((p) => (
                <PlanRow key={p.id} plan={p} meta={metaLine(p)} colors={colors} onPress={() => open(p.id)} />
              ))}
            </>
          )}

          {/* A plan you built but have not started. Building used to mean
              starting, which ended whatever you were already reading, so a good
              plan at the wrong moment had to be thrown away. */}
          {savedPlans.length > 0 && (
            <>
              <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Saved for later</Text>
              {savedPlans.map((p) => (
                <PlanRow key={p.id} plan={p} meta={metaLine(p)} colors={colors} onPress={() => open(p.id)} />
              ))}
            </>
          )}

          {historyCount > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => { haptics.tap(); router.push('/(tabs)/plans/finished'); }}
              style={[styles.finished, { borderColor: colors.line }]}>
              <CheckCircle size={17} color={colors.accent2} weight="regular" />
              <Text style={[styles.finishedText, { color: colors.ink2 }]}>
                {completedPlans.length > 0
                  ? `${completedPlans.length} plan${completedPlans.length === 1 ? '' : 's'} finished together`
                  : "Plans you've read together"}
              </Text>
              <CaretRight size={15} color={colors.accent2} weight="regular" />
            </TouchableOpacity>
          )}
        </>
      )}
    </Screen>
  );
}

function PlanRow({ plan, meta, colors, onPress }: { plan: any; meta: string; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
        <Flower size={19} color={colors.accent2} weight="fill" />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={2}>{plan.title}</Text>
        <Text style={[styles.rowMeta, { color: colors.muted }]}>{meta}</Text>
      </View>
      <CaretRight size={15} color={colors.accent2} weight="regular" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 },
  title: { marginTop: 8 },

  search: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, paddingVertical: 13 },

  eyebrow: { marginTop: 22, marginBottom: 10 },

  hero: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  heroBannerLabel: { paddingHorizontal: 18, paddingBottom: 13, justifyContent: 'flex-end', flex: 1 },
  heroBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 15 },
  track: { height: 5, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
  viewPlan: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewPlanText: { letterSpacing: 1.1 },

  doors: { flexDirection: 'row', gap: 11 },
  door: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 15, minHeight: 138, gap: 7 },
  doorIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  doorTitle: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 21 },
  doorSub: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 16, marginTop: 'auto', opacity: 0.85 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.serif, fontSize: 15 },
  rowMeta: { fontFamily: fonts.sans, fontSize: 11.5, marginTop: 2 },

  buildFromSearch: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, marginTop: 6 },
  bfsTitle: { fontFamily: fonts.serif, fontSize: 15 },
  bfsSub: { fontFamily: fonts.sans, fontSize: 11.5, marginTop: 2, opacity: 0.8 },

  finished: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginTop: 22 },
  finishedText: { flex: 1, fontFamily: fonts.sans, fontSize: 12.5 },
});
