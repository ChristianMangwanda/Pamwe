import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { fadeAt, landStep, standUp, riseAt } from '../lib/motion';
import { ARRIVAL_W, ARRIVAL_H, ARRIVAL_STEPS, arrivalScene, arrivalHeadline } from '../lib/grove';
import { TREE_SOURCES, STEP_SOURCES } from '../lib/groveArt';
import type { TreeAward } from '../lib/treeAwards';

// The planting: the rarest moment the app has, and the only sequence in it
// longer than half a second. A couple sees this six times in four years.
//
// They walk the last stretch, then the tree stands up. The prints land one at a
// time, left then right at walking pace, and only once they have all landed
// does the tree grow. Transform and opacity, nothing else.
//
//   0ms     the panel covers the completion screen, success haptic
//   120ms   PLANTING eyebrow
//   500ms   twelve prints land, 46ms apart, light haptic every fourth
//   1100ms  the tree grows out of its base over 500ms, medium haptic
//   1300ms  it settles, celebrate haptic
//   1450ms  the species name
//   1650ms  its line
//   1900ms  the two ways out. Ends at 2250ms.
//
// Reduce Motion gets its own timeline: the finished scene crossfades in over
// 200ms, the words 200ms later, one success haptic, done at 400ms. Nothing
// translates, nothing scales, no print lands on its own.

const STEP_FIRST = 500;
const STEP_APART = 46;
const TREE_AT = 1100;
const SETTLED_AT = 1300;
const TITLE_AT = 1450;
const LINE_AT = 1650;
const BUTTONS_AT = 1900;

/**
 * Everything on this screen that is not the walk: the safe areas, the eyebrow,
 * the two lines of text, both buttons and their padding, measured at ~382pt
 * with headroom. What is left over is what the walk gets drawn at.
 *
 * The scene is 370 tall by itself, so on the shortest phone the app runs on
 * (667pt, iPhone SE) it has to come down to about 0.73 to fit. Measuring it
 * would cost a frame at the start of the one sequence that cannot stutter.
 */
const CHROME = 396;

export function PlantingCeremony({
  award, onSeeGrove, onDismiss,
}: {
  award: TreeAward;
  /** Hand off to the Grove, at this tree. */
  onSeeGrove: () => void;
  /** Stay here: the completion screen is underneath. */
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  // Read once. Nothing renders until it resolves, so no beat is ever played on
  // the wrong timeline and then corrected.
  const [reduce, setReduce] = useState<boolean | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scene = arrivalScene(award);
  const scale = Math.min(1, (width - 68) / ARRIVAL_W, (height - CHROME) / ARRIVAL_H);
  const at = (v: number) => v * scale;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(v); })
      // Reading the setting should cost the variant, not the planting.
      .catch(() => { if (alive) setReduce(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduce === null) return;
    const mark = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

    haptics.success();
    if (!reduce) {
      // Every fourth print, so the walk is felt as a rhythm rather than
      // drummed out twelve times.
      for (let n = 0; n < ARRIVAL_STEPS; n += 4) mark(STEP_FIRST + n * STEP_APART, haptics.light);
      mark(TREE_AT, haptics.medium);
      mark(SETTLED_AT, haptics.celebrate);
    }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [reduce]);

  if (reduce === null) return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />;

  // In the Reduce Motion timeline the scene is already whole, so everything in
  // it shares one 200ms crossfade and the words follow at 200ms.
  const stepAt = (n: number) => (reduce ? 0 : STEP_FIRST + n * STEP_APART);
  const words = (mark: number) => riseAt(reduce ? 200 : mark, !!reduce);

  return (
    // The backdrop does NOT animate in. It is the same colour as the screen
    // underneath, so it lands as the completion screen's contents clearing away
    // and a beat of quiet before the walk starts. It also keeps this from being
    // an entering parent wrapping entering children, which Reanimated will drop.
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      exiting={FadeOut.duration(220)}
      // The completion screen is still mounted underneath, so say that it is
      // not the thing being read.
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View entering={fadeAt(reduce ? 0 : 120, 350)}>
          <Text variant="eyebrow" color={colors.muted}>Planting</Text>
        </Animated.View>

        <View style={{ width: at(ARRIVAL_W), height: at(ARRIVAL_H), marginTop: 14 }}>
          {scene.steps.map((s, n) => (
            // The angle is on the wrapper and only the print inside it scales,
            // so nothing has to animate a rotation the foot never turns through.
            <View
              key={s.key}
              style={{
                position: 'absolute',
                left: at(s.left),
                bottom: at(s.bottom),
                width: at(s.width),
                height: at(s.height),
                transform: [{ rotate: `${s.rotate}deg` }],
              }}
            >
              <Animated.Image
                source={STEP_SOURCES[s.foot]}
                tintColor={colors.accent2}
                resizeMode="contain"
                entering={landStep(stepAt(n), !!reduce)}
                style={styles.fill}
              />
            </View>
          ))}

          {/* The tree before this one, already standing, at the foot of the
              path. The fig has none, and its corner stays empty. */}
          {scene.prev && (
            <Animated.Image
              source={TREE_SOURCES[scene.prev.id]}
              tintColor={colors.accent}
              resizeMode="contain"
              entering={fadeAt(0, reduce ? 200 : 350)}
              style={{
                position: 'absolute',
                left: at(scene.prev.left),
                bottom: at(scene.prev.bottom),
                width: at(scene.prev.width),
                height: at(scene.prev.height),
                opacity: 0.35,
              }}
            />
          )}

          <Animated.Image
            source={TREE_SOURCES[award.id]}
            tintColor={colors.accent}
            resizeMode="contain"
            accessibilityLabel={`${award.name}, newly planted`}
            entering={standUp(reduce ? 0 : TREE_AT, !!reduce)}
            style={{
              position: 'absolute',
              left: at(scene.tree.left),
              bottom: at(scene.tree.bottom),
              width: at(scene.tree.width),
              height: at(scene.tree.height),
              transformOrigin: '50% 100%',
            }}
          />
        </View>

        <Animated.View entering={words(TITLE_AT)}>
          <Text variant="h1" style={styles.headline}>{arrivalHeadline(award)}</Text>
        </Animated.View>
        <Animated.View entering={words(LINE_AT)}>
          <Text variant="journal" color={colors.ink2} style={styles.line}>{award.line}</Text>
        </Animated.View>

        <Animated.View style={styles.footer} entering={words(BUTTONS_AT)}>
          <Button title="See your grove" onPress={onSeeGrove} />
          <Button title="Not now" variant="ghost" onPress={onDismiss} style={styles.notNow} />
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', paddingHorizontal: 34, paddingTop: 26, paddingBottom: 12 },
  fill: { width: '100%', height: '100%' },
  headline: { marginTop: 18, textAlign: 'center' },
  line: { marginTop: 10, textAlign: 'center', lineHeight: 26 },
  footer: { marginTop: 'auto', alignSelf: 'stretch' },
  notNow: { marginTop: 4 },
});
