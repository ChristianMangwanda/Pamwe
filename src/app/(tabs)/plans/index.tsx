import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { MagnifyingGlass, ArrowRight, CaretRight, Flower, CheckCircle, Sparkle, SquaresFour, X, Heart } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { StripedBanner } from '../../../components/ui/StripedBanner';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import {
  getBrowsablePlans, getCouplePlans, getCompletedCouplePlans,
  getReaderCounts, searchPlans, filterPlans, topicsIn,
} from '../../../lib/plans';
import { bannerTintForPlan } from '../../../lib/planArtwork';
import { haptics } from '../../../lib/haptics';

const PLANS_CACHE_KEY = 'pamwe:plansBrowse';
const LENGTHS = [7, 14, 21, 30];

export default function PlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan } = useCouple();
  const [browsable, setBrowsable] = useState<any[]>([]);
  const [myPlans, setMyPlans] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);

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
      const [b, mine, done] = await Promise.all([
        getBrowsablePlans(),
        couple?.id ? getCouplePlans(couple.id) : Promise.resolve([]),
        couple?.id ? getCompletedCouplePlans(couple.id) : Promise.resolve([]),
      ]);
      setBrowsable(b);
      setMyPlans(mine);
      setCompleted(done);
      AsyncStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(b)).catch(() => {});
      getReaderCounts(b.map((p: any) => p.id)).then(setCounts).catch(() => {});
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
  // and never the plan that's being read right now.
  const seenPlanIds = new Set<string>();
  const completedPlans = completed.filter((cp) => {
    if (!cp.plan || cp.plan_id === activePlan?.id || seenPlanIds.has(cp.plan_id)) return false;
    seenPlanIds.add(cp.plan_id);
    return true;
  });

  const topics = useMemo(() => topicsIn(browsable).slice(0, 8), [browsable]);
  const searching = query.trim().length > 0;
  // Search runs over everything the couple could open, their own plans
  // included, since "that plan we built about waiting" is a thing people look
  // for. Chips only narrow the browse grid.
  const results = useMemo(
    () => searchPlans([...myPlans, ...browsable], query),
    [myPlans, browsable, query],
  );
  const browseList = useMemo(() => filterPlans(browsable, topic, days), [browsable, topic, days]);

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

            <TouchableOpacity activeOpacity={0.9} onPress={() => { haptics.tap(); setTopic(null); setDays(null); }}
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

          {myPlans.length > 0 && (
            <>
              <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Your plans</Text>
              {myPlans.map((p) => (
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
            </>
          )}

          {topics.length > 0 && (
            <>
              <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Browse by topic</Text>
              <View style={styles.chips}>
                {topics.map((t) => (
                  <Chip key={t} label={t} on={topic === t} colors={colors}
                    onPress={() => { haptics.tap(); setTopic(topic === t ? null : t); }} />
                ))}
              </View>
            </>
          )}

          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Length</Text>
          <View style={styles.chips}>
            {LENGTHS.map((d) => (
              <Chip key={d} label={`${d} days`} on={days === d} colors={colors}
                onPress={() => { haptics.tap(); setDays(days === d ? null : d); }} />
            ))}
          </View>

          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
            {topic || days ? `${browseList.length} plan${browseList.length === 1 ? '' : 's'}` : 'All plans'}
          </Text>
          {browseList.length === 0 ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => build(topic ?? undefined)}
              style={[styles.emptyBrowse, { borderColor: colors.lineAccent, backgroundColor: colors.surface2 }]}>
              <Text style={[styles.emptyText, { color: colors.ink2 }]}>
                Nothing here yet with that shape. Pamwe can build one instead.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.grid}>
              {browseList.map((p: any) => (
                <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => open(p.id)}
                  style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <StripedBanner height={64} stripe={6} tint={bannerTintForPlan(p)} />
                  <View style={styles.gridBody}>
                    <Text style={[styles.gridTitle, { color: colors.ink }]} numberOfLines={2}>{p.title}</Text>
                    <Text style={[styles.gridMeta, { color: colors.muted }]}>{metaLine(p)}</Text>
                    {counts[p.id] > 1 && (
                      <View style={styles.readBy}>
                        <Heart size={10} color={colors.accent2} weight="fill" />
                        <Text style={[styles.readByText, { color: colors.accent2 }]}>
                          Read by {counts[p.id]} couples
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Finished plans were a full card each, sitting between the couple
              and the plans they could start next. One line, and the real record
              lives with the tree in the You tab. */}
          {completedPlans.length > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => open(completedPlans[0].plan.id)}
              style={[styles.finished, { borderColor: colors.line }]}>
              <CheckCircle size={17} color={colors.accent2} weight="regular" />
              <Text style={[styles.finishedText, { color: colors.ink2 }]}>
                {completedPlans.length} plan{completedPlans.length === 1 ? '' : 's'} finished together
              </Text>
              <CaretRight size={15} color={colors.accent2} weight="regular" />
            </TouchableOpacity>
          )}
        </>
      )}
    </Screen>
  );
}

function Chip({ label, on, colors, onPress }: { label: string; on: boolean; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.chip, {
        backgroundColor: on ? colors.accent : colors.surface,
        borderColor: on ? colors.accent : colors.line,
      }]}>
      <Text variant="chip" color={on ? colors.bg : colors.ink2} style={styles.chipText}>{label}</Text>
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

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 10, letterSpacing: 0.7 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  gridCard: { width: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  gridBody: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 13 },
  gridTitle: { fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 17 },
  gridMeta: { fontFamily: fonts.sans, fontSize: 10.5, marginTop: 5 },
  readBy: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  readByText: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

  emptyBrowse: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  emptyText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  finished: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginTop: 22 },
  finishedText: { flex: 1, fontFamily: fonts.sans, fontSize: 12.5 },
});
