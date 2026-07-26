import { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import { Text } from './ui/Text';
import { Floral } from './ui/Floral';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';

// The moment the whole app is built around: you both wrote, so now you both
// read. It used to just appear, which made the one genuinely ceremonial event
// in the ritual feel like any other screen load.
//
// Your two initials drift in from opposite edges, meet in the middle with a
// pulse and a haptic, and the floral divider draws outward from where they
// touched. Then the reflections unfurl underneath. About 1.5 seconds, and a tap
// anywhere skips straight to reading.
//
// The app's own settle curve (lib/motion.ts). ReduceMotion.System is honoured
// throughout, so with the OS setting on the pieces simply arrive in place.
const settle = Easing.bezier(0.22, 1, 0.36, 1);
const OFFSET = 58;

// Beat boundaries, in ms.
const DRIFT = 560;
const MEET = 180;
const DRAW = 380;
const HOLD = 160;

export function RevealCeremony({
  myInitial, partnerInitial, onDone,
}: { myInitial: string; partnerInitial: string; onDone: () => void }) {
  const { colors } = useTheme();
  // onDone must fire exactly once: the timeline and a skip tap race each other.
  const finished = useRef(false);

  const drift = useSharedValue(0);      // 0 = apart, 1 = touching
  const marks = useSharedValue(0);      // opacity of the two initials
  const pulse = useSharedValue(1);
  const divider = useSharedValue(0);
  const veil = useSharedValue(1);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  // Skip: drop the veil quickly rather than cutting, so a tap still feels like
  // a transition instead of a glitch.
  const skip = () => {
    if (finished.current) return;
    veil.value = withTiming(0, { duration: 140 }, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  useEffect(() => {
    const timing = (duration: number, delay = 0) =>
      withDelay(delay, withTiming(1, { duration, easing: settle, reduceMotion: ReduceMotion.System }));

    marks.value = timing(320);
    drift.value = timing(DRIFT);

    // They touch: a small swell plus the success haptic, on the same beat.
    pulse.value = withDelay(
      DRIFT,
      withSequence(
        withTiming(1.07, { duration: MEET * 0.5, easing: settle, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: MEET, easing: settle, reduceMotion: ReduceMotion.System }),
      ),
    );
    const hapticAt = setTimeout(() => haptics.success(), DRIFT);

    divider.value = timing(DRAW, DRIFT + MEET);

    veil.value = withDelay(
      DRIFT + MEET + DRAW + HOLD,
      withTiming(0, { duration: 260, easing: settle, reduceMotion: ReduceMotion.System }, (done) => {
        if (done) runOnJS(finish)();
      }),
    );

    return () => clearTimeout(hapticAt);
    // Mount-only: this is a one-shot timeline.
  }, []);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const leftStyle = useAnimatedStyle(() => ({
    opacity: marks.value,
    transform: [{ translateX: -OFFSET * (1 - drift.value) }, { scale: pulse.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: marks.value,
    transform: [{ translateX: OFFSET * (1 - drift.value) }, { scale: pulse.value }],
  }));
  const dividerStyle = useAnimatedStyle(() => ({
    opacity: divider.value,
    transform: [{ scaleX: 0.4 + 0.6 * divider.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]}>
      <Pressable
        style={styles.fill}
        onPress={skip}
        accessibilityRole="button"
        accessibilityLabel="Skip to your reflections"
      >
        <View style={styles.center}>
          <View style={styles.marks}>
            <Animated.View style={[styles.badge, { borderColor: colors.accent2 }, leftStyle]}>
              <Text style={[styles.initial, { color: colors.accent }]}>{myInitial}</Text>
            </Animated.View>
            <Animated.View style={[styles.badge, { backgroundColor: colors.accent2, borderColor: colors.accent2 }, rightStyle]}>
              <Text style={[styles.initial, { color: colors.surface }]}>{partnerInitial}</Text>
            </Animated.View>
          </View>

          <Animated.View style={dividerStyle}>
            <Floral variant="divider" style={styles.divider} />
          </Animated.View>

          <Animated.View style={dividerStyle}>
            <Text italic color={colors.ink2} style={styles.line}>You both showed up.</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Negative gap so the two badges overlap slightly when they meet.
  marks: { flexDirection: 'row', alignItems: 'center', gap: -6 },
  badge: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  initial: { fontFamily: fonts.serif, fontSize: 19 },
  divider: { width: 150, height: 26, marginTop: 22, opacity: 0.9 },
  line: { fontFamily: fonts.serifItalic, fontSize: 15, marginTop: 14, textAlign: 'center' },
});
