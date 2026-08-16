import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Floral } from './ui/Floral';
import { useTheme } from '../providers/ThemeProvider';
import { fonts } from '../constants/typography';
import { haptics } from '../lib/haptics';
import { fadeAt, landStep, riseAt } from '../lib/motion';

// Catching up, finished. Someone sat down and wrote several days at once, and
// this is the only place the app says so.
//
// It is a MOMENT, not a trophy. The Grove's rule stands: days do not mint a
// second award, because that is what keeps a streak from competing with a plan
// you actually finished. So nothing is stored and nothing accrues. The days
// land, they are named, and the screen goes back to being the catch-up list
// with nothing left on it.
//
// Deliberately smaller than the planting. It tops out at a success haptic:
// `celebrate` is used exactly once in the whole app, when a tree settles, and
// that scarcity is the point.
//
//   0ms     the panel covers the catch-up list, no animation, no haptic
//   140ms   CAUGHT UP eyebrow
//   420ms   the days land in order, light haptic on each
//   +260ms  the headline, success haptic
//   +200ms  the line
//   +240ms  the way out
//
// Reduce Motion gets its own timeline: everything crossfades in over 200ms, the
// words 200ms later, one success haptic, done at 400ms. Nothing scales, no day
// lands on its own.

const MARK_FIRST = 420;
const AFTER_MARKS = 260;
const LINE_AFTER = 200;
const BUTTON_AFTER = 240;

/**
 * How far apart the days land.
 *
 * Three days want a beat each; a fortnight away wants the whole flight over
 * inside a second, or the moment outstays a backlog that was already tedious.
 * Bounded both ways: never slower than the planting's walk reads, never so fast
 * that two land on the same frame.
 */
export function markApart(count: number): number {
  return Math.min(150, Math.max(45, Math.round(700 / Math.max(1, count))));
}

export function BackInStep({
  days, onDone,
}: {
  /** The plan days written in this sitting, in order. Always two or more. */
  days: number[];
  /** Dismiss: the catch-up list, now empty, is underneath. */
  onDone: () => void;
}) {
  const { colors } = useTheme();

  // Read once. Nothing renders until it resolves, so no beat is ever played on
  // the wrong timeline and then corrected.
  const [reduce, setReduce] = useState<boolean | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const apart = markApart(days.length);
  const lastMark = MARK_FIRST + (days.length - 1) * apart;
  const titleAt = lastMark + AFTER_MARKS;
  const lineAt = titleAt + LINE_AFTER;
  const buttonAt = lineAt + BUTTON_AFTER;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(v); })
      // Reading the setting should cost the variant, not the moment.
      .catch(() => { if (alive) setReduce(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduce === null) return;
    const mark = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

    if (reduce) {
      haptics.success();
    } else {
      // Every day for a short run, every third for a long one, so a fortnight
      // is felt as a rhythm rather than drummed out fourteen times.
      const every = days.length > 5 ? 3 : 1;
      for (let n = 0; n < days.length; n += every) mark(MARK_FIRST + n * apart, haptics.light);
      mark(titleAt, haptics.success);
    }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [reduce, days.length, apart, titleAt]);

  if (reduce === null) return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />;

  const markAt = (n: number) => (reduce ? 0 : MARK_FIRST + n * apart);
  const words = (at: number) => riseAt(reduce ? 200 : at, !!reduce);

  return (
    // The backdrop does NOT animate in. It is the same colour as the list
    // underneath, so it lands as that list clearing away and a beat of quiet
    // before the days arrive. It also keeps this from being an entering parent
    // wrapping entering children, which Reanimated will drop.
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      exiting={FadeOut.duration(220)}
      // The catch-up screen is still mounted underneath, so say that it is not
      // the thing being read.
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View entering={fadeAt(reduce ? 0 : 140, 350)}>
          <Text variant="eyebrow" color={colors.muted}>Caught up</Text>
        </Animated.View>

        <View style={styles.marks} accessibilityLabel={`Days ${days.join(', ')}, written`}>
          {days.map((day, n) => (
            <Animated.View
              key={day}
              entering={landStep(markAt(n), !!reduce)}
              style={[styles.mark, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}
            >
              <Text style={[styles.markText, { color: colors.accent }]}>Day {day}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={words(titleAt)}>
          <Text variant="h1" style={styles.headline}>{days.length} days, in one sitting.</Text>
        </Animated.View>
        <Animated.View entering={words(lineAt)} style={styles.lineWrap}>
          <Floral variant="divider" style={styles.floral} />
          <Text variant="journal" color={colors.ink2} style={styles.line}>
            Back on track!
          </Text>
        </Animated.View>

        <Animated.View style={styles.footer} entering={words(buttonAt)}>
          <Button title="Back to Today" onPress={onDone} />
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingTop: 26, paddingBottom: 12 },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 26 },
  mark: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  markText: { fontFamily: fonts.sansMedium, fontSize: 13 },
  headline: { marginTop: 30, textAlign: 'center' },
  lineWrap: { alignItems: 'center' },
  floral: { width: 150, height: 26, opacity: 0.85, marginTop: 18 },
  line: { marginTop: 14, textAlign: 'center', lineHeight: 26 },
  footer: { marginTop: 'auto', alignSelf: 'stretch' },
});
