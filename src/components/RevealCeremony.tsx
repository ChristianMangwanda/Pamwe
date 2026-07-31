import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, ReduceMotion, runOnJS,
  useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import type { EasingFunctionFactory, SharedValue } from 'react-native-reanimated';
import { Floral } from './ui/Floral';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { UnsealKind } from '../lib/motion';

// The moment the whole app is built around: you both wrote, so now you both
// read. Four acts across 4.3 seconds, from design_handoff_reveal_ceremony.
//
//   I   Approach  260 to 1980   two orbs cross in from beyond both edges,
//                               haptic ticks quickening as the gap closes
//   II  Meeting   1980 to 2420  they press 6pt past touching, swell, settle;
//                               glow flares, two rings ripple, the strong beat
//   III Bloom     2260 to 3590  the rose opens out of the meeting point, vines
//                               grow outward from it, sprigs rise behind
//   IV  Amen      3420 to 4260  the word alone, then 240ms of held silence
//
// Then the veil lifts and the reflection cards unfurl underneath. Tap anywhere
// skips. Reduce Motion gets its own crossfade timeline, 1960ms, one haptic.
//
// Every mark below is absolute milliseconds from ceremony start and is exact.

// The app's one settle curve (lib/motion.ts), plus this timeline's own curves.
const settle = Easing.bezier(0.22, 1, 0.36, 1);
const approach = Easing.bezier(0.33, 0, 0.5, 0.85);
const closeIn = Easing.bezier(0.6, 0, 0.85, 0.4);
const swellOut = Easing.bezier(0.3, 0, 0.7, 1);
const flare = Easing.bezier(0.2, 0.8, 0.4, 1);
const ripple = Easing.bezier(0.2, 0.75, 0.3, 1);
const open = Easing.bezier(0.2, 0.85, 0.3, 1);
const lift = Easing.bezier(0.4, 0, 0.6, 1);

type Curve = EasingFunctionFactory | ((value: number) => number);

// This component branches on the accessibility setting itself and plays a
// separate crossfade timeline for it, so no single animation should be
// second-guessed by ReduceMotion.System on top of that.
const t = (toValue: number, duration: number, easing: Curve) =>
  withTiming(toValue, { duration, easing, reduceMotion: ReduceMotion.Never });

const ORB = 64;
const START_X = 237;      // beyond the edge of a 390pt screen
const APPROACH_X = 60;    // where the long approach ends
const PRESS_IN = 34;      // 6pt past touching, measured from APPROACH_X
const PRESS_REST = 28;    // resting at x = 32, so the two circles touch exactly
const GLOW = 236;
const VINE_W = 104, VINE_H = 42;
const BLOOM_W = 84, BLOOM_H = 94;
const SPRIG_W = 88, SPRIG_H = 70;
const WHOLE_W = 232, WHOLE_H = 42;

const VEIL_LIFT = 4260;   // full timeline: the veil starts going
const AMEN_SET = 4020;    // past this a tap only shortens the held silence
const R_VEIL_LIFT = 1560; // Reduce Motion timeline: same beat, sooner

const art = {
  glow: require('../../assets/images/reveal/orb-glow.png'),
  bloom: require('../../assets/images/reveal/bloom-center.png'),
  vineLeft: require('../../assets/images/reveal/vine-left.png'),
  vineRight: require('../../assets/images/reveal/vine-right.png'),
  sprigLeft: require('../../assets/images/reveal/sprig-left.png'),
  sprigRight: require('../../assets/images/reveal/sprig-right.png'),
} as const;

export function RevealCeremony({
  myInitial, partnerInitial, onCardsIn, onDone,
}: {
  myInitial: string;
  partnerInitial: string;
  /** The lift has begun: mount the cards so they unfurl under the fading veil. */
  onCardsIn: (kind: UnsealKind) => void;
  /** The veil is gone: the ceremony can come off the tree. */
  onDone: () => void;
}) {
  const { colors, mode } = useTheme();

  // Read once at mount. The timeline cannot start until it resolves, which is
  // invisible because the veil is opaque from the first frame either way.
  const [reduce, setReduce] = useState<boolean | null>(null);
  const full = reduce === false;

  const started = useRef(false);
  const finished = useRef(false);
  const carded = useRef(false);
  const startedAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const veil = useSharedValue(1);
  const groupOpacity = useSharedValue(1);
  const groupY = useSharedValue(0);
  const groupScale = useSharedValue(1);
  const orbFade = useSharedValue(0);
  const travel = useSharedValue(START_X);
  const press = useSharedValue(0);
  const swell = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.35);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.12);
  const bloomRotate = useSharedValue(-18);
  const vineLeftOpacity = useSharedValue(0);
  const vineLeftScale = useSharedValue(0.14);
  const vineRightOpacity = useSharedValue(0);
  const vineRightScale = useSharedValue(0.14);
  const sprigLeft = useSharedValue(0);
  const sprigRight = useSharedValue(0);
  const amen = useSharedValue(0);
  const whole = useSharedValue(0);

  const drivers: SharedValue<number>[] = [
    veil, groupOpacity, groupY, groupScale, orbFade, travel, press, swell,
    glowOpacity, glowScale, ring1, ring2, bloomOpacity, bloomScale, bloomRotate,
    vineLeftOpacity, vineLeftScale, vineRightOpacity, vineRightScale,
    sprigLeft, sprigRight, amen, whole,
  ];

  const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  const clearMarks = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // onDone must fire exactly once: the timeline and a skip tap race each other.
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    clearMarks();
    onDone();
  };

  const showCards = (kind: UnsealKind) => {
    if (carded.current) return;
    carded.current = true;
    onCardsIn(kind);
  };

  // The close: the group rises and fades out while the veil goes with it, and
  // the cards start unfurling underneath 140ms in, before the veil has cleared.
  const runLift = (delay: number) => {
    groupOpacity.value = withDelay(delay, t(0, 480, lift));
    groupY.value = withDelay(delay, t(-16, 480, lift));
    groupScale.value = withDelay(delay, t(1.03, 480, lift));
    veil.value = withDelay(delay, withTiming(
      0,
      { duration: 560, easing: lift, reduceMotion: ReduceMotion.Never },
      (done) => { if (done) runOnJS(finish)(); },
    ));
    at(delay + 140, () => showCards('full'));
  };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(v); })
      // Reading the setting should cost the variant, not the reveal.
      .catch(() => { if (alive) setReduce(false); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      // Only meaningful before the timeline commits. Flipping the setting mid
      // ceremony restarts nothing: the moment is not worth interrupting.
      if (alive && !started.current) setReduce(v);
    });
    return () => { alive = false; sub.remove(); clearMarks(); };
  }, []);

  useEffect(() => {
    if (reduce === null || started.current) return;
    started.current = true;
    startedAt.current = Date.now();

    if (reduce) {
      // No translation, no scale, no rotation. Crossfades only, same order of
      // acts, one haptic. The orbs are already touching at center.
      travel.value = PRESS_REST;
      orbFade.value = t(1, 320, Easing.linear);
      at(320, haptics.success);
      whole.value = withDelay(420, t(1, 360, Easing.linear));
      amen.value = withDelay(900, t(1, 360, Easing.linear));
      groupOpacity.value = withDelay(R_VEIL_LIFT, t(0, 360, Easing.linear));
      veil.value = withDelay(R_VEIL_LIFT, withTiming(
        0,
        { duration: 400, easing: lift, reduceMotion: ReduceMotion.Never },
        (done) => { if (done) runOnJS(finish)(); },
      ));
      at(R_VEIL_LIFT + 60, () => showCards('reduced'));
      return;
    }

    // Act I, the approach.
    orbFade.value = withDelay(260, t(1, 500, settle));
    travel.value = withDelay(260, t(APPROACH_X, 1320, approach));
    press.value = withDelay(1580, withSequence(t(PRESS_IN, 380, closeIn), t(PRESS_REST, 340, settle)));

    // Act II, the meeting.
    swell.value = withDelay(1980, withSequence(t(1.12, 60, swellOut), t(1, 380, settle)));
    // The glow holds at 0.3 after its flare and only leaves with the veil, so
    // the meeting point stays warm while the flower grows.
    glowOpacity.value = withDelay(1980, withSequence(t(0.85, 140, flare), t(0.3, 460, settle)));
    glowScale.value = withDelay(1980, withSequence(t(1.5, 140, flare), t(1.18, 460, settle)));
    ring1.value = withDelay(1980, t(1, 720, ripple));
    ring2.value = withDelay(2100, t(1, 760, ripple));

    // Act III, the bloom.
    bloomOpacity.value = withDelay(2260, t(1, 300, open));
    bloomScale.value = withDelay(2260, withSequence(t(1.08, 300, open), t(1, 260, settle)));
    bloomRotate.value = withDelay(2260, withSequence(t(2, 300, open), t(0, 260, settle)));
    vineLeftOpacity.value = withDelay(2600, t(1, 200, settle));
    vineLeftScale.value = withDelay(2600, t(1, 600, settle));
    vineRightOpacity.value = withDelay(2640, t(1, 200, settle));
    vineRightScale.value = withDelay(2640, t(1, 600, settle));
    sprigLeft.value = withDelay(2900, t(1, 600, settle));
    sprigRight.value = withDelay(2990, t(1, 600, settle));

    // Act IV, the word. Then 4020 to 4260 is the exhale: nothing moves.
    amen.value = withDelay(3420, t(1, 600, settle));
    runLift(VEIL_LIFT);

    // The quickening. Nothing fires after 2280, so "Amen" lands in silence.
    at(900, haptics.tap);
    at(1340, haptics.light);
    at(1620, haptics.light);
    at(1800, haptics.light);
    at(1900, haptics.light);
    at(1980, haptics.medium);
    at(2020, haptics.success);
    at(2050, haptics.light);
    at(2280, haptics.tap);
    // One shot, and only once the setting has been read.
  }, [reduce]);

  const skip = () => {
    if (!started.current || finished.current) return;
    const elapsed = Date.now() - startedAt.current;
    // The lift is already running. Let it finish rather than restarting it
    // halfway and jumping.
    if (elapsed >= (reduce ? R_VEIL_LIFT : VEIL_LIFT)) return;

    clearMarks();
    // Hold every value where it stands. Cancelling leaves each one at its
    // current frame, so nothing snaps back to a keyframe it already passed.
    drivers.forEach(cancelAnimation);

    if (full && elapsed >= AMEN_SET) {
      // The word has landed. A tap here only shortens the held silence, so run
      // the ceremony's own close rather than a hurried one.
      runLift(0);
      return;
    }

    groupOpacity.value = withTiming(0, {
      duration: 160, easing: Easing.linear, reduceMotion: ReduceMotion.Never,
    });
    veil.value = withDelay(60, withTiming(
      0,
      { duration: 220, easing: lift, reduceMotion: ReduceMotion.Never },
      (done) => { if (done) runOnJS(finish)(); },
    ));
    showCards('skip');
  };

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const groupStyle = useAnimatedStyle(() => ({
    opacity: groupOpacity.value,
    transform: [{ translateY: groupY.value }, { scale: groupScale.value }],
  }));
  const leftOrbStyle = useAnimatedStyle(() => ({
    opacity: orbFade.value,
    transform: [{ translateX: -travel.value + press.value }, { scale: swell.value }],
  }));
  const rightOrbStyle = useAnimatedStyle(() => ({
    opacity: orbFade.value,
    transform: [{ translateX: travel.value - press.value }, { scale: swell.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  // A ring is invisible until its own mark: 0 is "not started", and the moment
  // it starts it is at 0.5 and fading as it expands to 2.9.
  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1.value === 0 ? 0 : 0.5 * (1 - ring1.value),
    transform: [{ scale: 0.55 + 2.35 * ring1.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2.value === 0 ? 0 : 0.5 * (1 - ring2.value),
    transform: [{ scale: 0.55 + 2.35 * ring2.value }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }, { rotate: `${bloomRotate.value}deg` }],
  }));
  // React Native has no transform-origin, so translate out, scale, translate
  // back. That pins the edge nearest the bloom and the vine reads as growing
  // outward from it rather than sliding in.
  const vineLeftStyle = useAnimatedStyle(() => ({
    opacity: vineLeftOpacity.value,
    transform: [
      { translateX: VINE_W / 2 }, { scaleX: vineLeftScale.value }, { translateX: -VINE_W / 2 },
    ],
  }));
  const vineRightStyle = useAnimatedStyle(() => ({
    opacity: vineRightOpacity.value,
    transform: [
      { translateX: -VINE_W / 2 }, { scaleX: vineRightScale.value }, { translateX: VINE_W / 2 },
    ],
  }));
  const sprigLeftStyle = useAnimatedStyle(() => ({
    opacity: 0.92 * sprigLeft.value,
    transform: [{ translateY: 10 * (1 - sprigLeft.value) }, { scale: 0.86 + 0.14 * sprigLeft.value }],
  }));
  const sprigRightStyle = useAnimatedStyle(() => ({
    opacity: 0.92 * sprigRight.value,
    transform: [{ translateY: 10 * (1 - sprigRight.value) }, { scale: 0.86 + 0.14 * sprigRight.value }],
  }));
  const amenStyle = useAnimatedStyle(() => ({
    opacity: amen.value,
    transform: full
      ? [{ translateY: 14 * (1 - amen.value) }, { scale: 0.94 + 0.06 * amen.value }]
      : [],
  }));
  const wholeStyle = useAnimatedStyle(() => ({ opacity: whole.value }));

  const orb = { backgroundColor: colors.sel, borderColor: colors.accent2 };

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={skip}
      accessibilityRole="button"
      accessibilityLabel="Skip to your reflections"
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]} />

      {reduce !== null && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.group, groupStyle]} pointerEvents="none">
          <View style={styles.orbRow}>
            {full && (
              <>
                <View style={styles.layer}>
                  <Animated.Image
                    source={art.glow}
                    resizeMode="contain"
                    style={[
                      styles.glow,
                      { tintColor: mode === 'dark' ? colors.accent : colors.lineAccent },
                      glowStyle,
                    ]}
                  />
                </View>
                <View style={styles.layer}>
                  <Animated.View style={[styles.ring, { borderColor: colors.accent2 }, ring1Style]} />
                </View>
                <View style={styles.layer}>
                  <Animated.View style={[styles.ring, { borderColor: colors.lineAccent }, ring2Style]} />
                </View>
                <View style={styles.sprigRow}>
                  <Animated.Image source={art.sprigLeft} resizeMode="contain" style={[styles.sprig, sprigLeftStyle]} />
                  <Animated.Image source={art.sprigRight} resizeMode="contain" style={[styles.sprig, sprigRightStyle]} />
                </View>
              </>
            )}

            <View style={styles.layer}>
              <Animated.View style={[styles.orb, orb, leftOrbStyle]}>
                <Text style={[styles.initial, { color: colors.accent }]}>{myInitial}</Text>
              </Animated.View>
            </View>
            <View style={styles.layer}>
              <Animated.View style={[styles.orb, orb, rightOrbStyle]}>
                <Text style={[styles.initial, { color: colors.accent }]}>{partnerInitial}</Text>
              </Animated.View>
            </View>
          </View>

          {full ? (
            <View style={styles.flowerRow}>
              <Animated.Image source={art.vineLeft} resizeMode="contain" style={[styles.vine, vineLeftStyle]} />
              <Animated.Image source={art.bloom} resizeMode="contain" style={[styles.bloom, bloomStyle]} />
              <Animated.Image source={art.vineRight} resizeMode="contain" style={[styles.vine, vineRightStyle]} />
            </View>
          ) : (
            // Reduce Motion gets the flower whole, in one fade, with no growth
            // and no stagger.
            <Animated.View style={[styles.wholeRow, wholeStyle]}>
              <Floral variant="divider" style={styles.whole} />
            </Animated.View>
          )}

          <Animated.Text style={[styles.amen, { color: colors.accent }, amenStyle]}>Amen</Animated.Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { alignItems: 'center', justifyContent: 'center' },
  orbRow: { width: '100%', height: ORB, alignItems: 'center', justifyContent: 'center' },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  glow: { width: GLOW, height: GLOW },
  ring: { width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 1 },
  sprigRow: {
    position: 'absolute', top: -56, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 84,
  },
  sprig: { width: SPRIG_W, height: SPRIG_H },
  orb: {
    width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  initial: { fontFamily: fonts.serifMedium, fontSize: 22 },
  flowerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  vine: { width: VINE_W, height: VINE_H },
  // The bloom overlaps the vines by 4pt each side, where the seams line up.
  bloom: { width: BLOOM_W, height: BLOOM_H, marginHorizontal: -4 },
  wholeRow: { marginTop: 30 },
  whole: { width: WHOLE_W, height: WHOLE_H },
  // 30pt is a deliberate jump up from the old 15pt: it is the last thing on
  // screen and it should be able to carry the beat on its own.
  amen: { fontFamily: fonts.serifItalic, fontSize: 30, letterSpacing: 30 * 0.04, marginTop: 22 },
});
