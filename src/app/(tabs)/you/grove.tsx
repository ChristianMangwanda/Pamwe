import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { finishedPlans, type FinishedPlan } from '../../../lib/planHistory';
import { TREE_AWARDS, type TreeAward } from '../../../lib/treeAwards';
import {
  SCENE_W, SCENE_H, sceneTrees, footprints, walkFor,
  groveSubtitle, streakFoot, word,
} from '../../../lib/grove';
import { TREE_SOURCES, STEP_SOURCES } from '../../../lib/groveArt';
import { haptics } from '../../../lib/haptics';

// The Grove is a walk, and you can see the footprints. A list ranks; a path
// records. One scene end to end: two sets of prints climbing from where a
// couple started to where they stand, a tree rooted at every threshold they
// passed, and the trees still ahead standing pale further up.
//
// Because the whole walk is visible from the first visit, the empty state is
// not an absence, it is a route. The page opens on the last thing earned, so
// the visit begins with the reward rather than with what is missing.
export default function GroveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const { width } = useWindowDimensions();
  // Arriving from a planting. Session only, nothing persisted: the emphasis
  // belongs to the transition, not to the data.
  const { arrived } = useLocalSearchParams<{ arrived?: string }>();

  const [plans, setPlans] = useState<number | null>(null);
  const [rows, setRows] = useState<FinishedPlan[]>([]);
  const [sheet, setSheet] = useState<TreeAward | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const streak = couple?.streak_count ?? 0;
  const scale = width / SCENE_W;

  // For the first 600ms the tree just planted holds full strength while the
  // rest of the walk comes up behind it, then everything settles level.
  const rest = useSharedValue(arrived ? 0.5 : 1);
  const restStyle = useAnimatedStyle(() => ({ opacity: rest.value }));
  useEffect(() => {
    if (!arrived) return;
    rest.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      // Honours the setting: with Reduce Motion on, the walk is simply level
      // from the first frame.
      reduceMotion: ReduceMotion.System,
    });
  }, [arrived]);

  useEffect(() => {
    let alive = true;
    if (!couple?.id) { setPlans(0); return; }
    finishedPlans(couple.id)
      .then((r) => { if (alive) { setRows(r); setPlans(r.length); } })
      .catch(() => { if (alive) { setRows([]); setPlans(0); } });
    return () => { alive = false; };
  }, [couple?.id]);

  const trees = useMemo(() => sceneTrees(plans ?? 0), [plans]);
  const prints = useMemo(() => footprints(plans ?? 0, streak), [plans, streak]);
  const { walked } = useMemo(() => walkFor(plans ?? 0, streak), [plans, streak]);

  // Open where they stand, not at the bottom of the walk, and on the tree just
  // planted when there is one. No scroll animation: the page is already there.
  const onSceneLayout = (h: number) => {
    if (scrolled.current || plans === null) return;
    scrolled.current = true;
    const focus = trees.find((t) => t.award.id === arrived)?.bottom ?? walked;
    const y = Math.max(0, SCENE_H * scale - focus * scale - h * 0.62);
    scrollRef.current?.scrollTo({ y, animated: false });
  };

  // The wrapper must fill the scene. Absolute children resolve against their
  // parent's frame, and a View holding only absolute children measures zero
  // high, which would put every tree's `bottom` above the top of the walk.
  // box-none so the stacked wrappers do not swallow each other's taps.
  const renderTree = (t: (typeof trees)[number]) => (
    <View key={t.award.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={{
          position: 'absolute',
          left: t.labelLeft * scale,
          top: (SCENE_H - t.bottom + 8) * scale,
          width: t.labelWidth * scale,
          alignItems: t.labelAlign,
        }}
        pointerEvents="none"
      >
        <View style={styles.labelRow}>
          <Text style={[styles.mark, { color: t.earned ? colors.accent : colors.muted }]}>
            {t.earned ? '●' : '○'}
          </Text>
          <Text style={[styles.labelName, { color: t.earned ? colors.accent : colors.muted }]}>
            {t.award.name}
          </Text>
        </View>
        <Text style={[styles.labelNote, { color: colors.muted }]}>
          {t.earned ? 'planted' : `at ${t.award.threshold} plans`}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={t.earned ? 1 : 0.7}
        disabled={t.earned}
        onPress={() => { haptics.tap(); setSheet(t.award); }}
        accessibilityRole={t.earned ? 'image' : 'button'}
        accessibilityLabel={t.a11y}
        style={{
          position: 'absolute',
          left: t.left * scale,
          bottom: t.bottom * scale,
          width: t.width * scale,
          height: t.height * scale,
        }}
      >
        <Image
          source={TREE_SOURCES[t.award.id]}
          tintColor={colors.accent}
          style={{ width: '100%', height: '100%', opacity: t.earned ? 1 : 0.24 }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  if (plans === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.head}>
          <BackLink label="You" onPress={() => router.back()} />
        </View>
        <View style={styles.center}><PamweLoading /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h1" style={styles.title}>Your grove</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          {groveSubtitle(plans)}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => onSceneLayout(e.nativeEvent.layout.height)}
      >
        <View style={{ width, height: SCENE_H * scale }}>
          {/* Everything except the tree just planted rides one opacity, so the
              arriving tree can be emphasised for a beat without animating a
              hundred prints one by one. */}
          <Animated.View style={[StyleSheet.absoluteFill, restStyle]}>
            {/* The route ahead, and the ground being covered right now. */}
            {prints.map((p) => (
              <Image
                key={p.key}
                source={STEP_SOURCES[p.foot]}
                tintColor={colors.accent2}
                style={{
                  position: 'absolute',
                  left: p.left * scale,
                  bottom: p.bottom * scale,
                  width: p.width * scale,
                  height: p.height * scale,
                  opacity: p.opacity,
                  transform: [{ rotate: `${p.rotate}deg` }],
                }}
              />
            ))}

            {trees.filter((t) => t.award.id !== arrived).map(renderTree)}

            {/* Above the last tree the path keeps going, unlabelled. */}
            <Text
              style={[styles.stillPlanting, { color: colors.muted, top: 26 * scale, width }]}
            >
              Still being planted
            </Text>
          </Animated.View>

          {trees.filter((t) => t.award.id === arrived).map(renderTree)}
        </View>

        <View style={styles.ledger}>
          <Text variant="eyebrow" color={colors.muted}>Finished together</Text>
          {rows.length === 0 ? (
            <Text style={[styles.ledgerEmpty, { color: colors.muted }]}>
              No plans finished yet. The first one goes here.
            </Text>
          ) : (
            rows.slice(0, 6).map((r) => (
              <View key={r.couplePlanId} style={[styles.ledgerRow, { borderTopColor: colors.line }]}>
                <Text style={[styles.ledgerName, { color: colors.ink }]} numberOfLines={1}>{r.title}</Text>
                <Text style={[styles.ledgerWhen, { color: colors.muted }]}>{monthOf(r.finishedOn)}</Text>
              </View>
            ))
          )}
          <Text style={[styles.ledgerFoot, { color: colors.ink2 }]}>
            {streakFoot(streak, plans)}
          </Text>
        </View>
      </ScrollView>

      <BottomSheet visible={!!sheet} onClose={() => setSheet(null)}>
        {sheet && (
          <View style={styles.sheet}>
            <Image
              source={TREE_SOURCES[sheet.id]}
              tintColor={colors.accent}
              style={{ width: 130 * sheet.ratio, height: 130, opacity: 0.24 }}
              resizeMode="contain"
            />
            <Text variant="eyebrow" color={colors.muted} style={styles.sheetEyebrow}>Not planted yet</Text>
            <Text variant="h2" style={styles.sheetName}>{sheet.name}</Text>
            <Text style={[styles.sheetBlurb, { color: colors.ink2 }]}>
              {sheet.line.replace(/^[^.]*\. /, '')}
            </Text>
            <Text style={[styles.sheetGate, { color: colors.muted }]}>
              {gateLine(sheet, plans)}
            </Text>
            <Button
              title="Browse reading plans"
              variant="secondary"
              onPress={() => { setSheet(null); router.push('/(tabs)/plans/browse'); }}
              style={styles.sheetCta}
            />
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function gateLine(tree: TreeAward, plans: number): string {
  const togo = Math.max(0, tree.threshold - plans);
  const have = plans === 0 ? 'none yet' : `${plans}`;
  return `Unlocks at ${tree.threshold} plans finished. You have ${have}, so ${togo === 1 ? 'one plan to go.' : `${togo} plans to go.`}`;
}

function monthOf(iso: string | null): string {
  if (!iso) return '·';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  head: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 14 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mark: { fontSize: 8, lineHeight: 12 },
  labelName: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' },
  labelNote: { fontFamily: fonts.sans, fontSize: 9.5, marginTop: 1 },

  stillPlanting: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.sansSemiBold,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  ledger: { paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 40 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  ledgerName: { flex: 1, fontFamily: fonts.serif, fontSize: 15 },
  ledgerWhen: { fontFamily: fonts.sans, fontSize: 11.5 },
  ledgerEmpty: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, marginTop: 10 },
  ledgerFoot: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21, marginTop: 16 },

  sheet: { alignItems: 'center', paddingBottom: 8 },
  sheetEyebrow: { marginTop: 12 },
  sheetName: { marginTop: 6 },
  sheetBlurb: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  sheetGate: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 10 },
  sheetCta: { alignSelf: 'stretch', marginTop: 18 },
});
