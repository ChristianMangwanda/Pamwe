import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { PamweWordmark } from '../PamweWordmark';

// Waiting should look like the app, not like a system component. Every tab used
// to show a bare spinner, so a slow launch read as something being wrong rather
// than something being fetched. This breathes the wordmark instead.
//
// The 0.22/1/0.36/1 settle curve is the app's own (see lib/motion.ts), and
// ReduceMotion.System honours the OS accessibility setting: with reduced motion
// on, the mark simply sits there at full opacity.
const settle = Easing.bezier(0.22, 1, 0.36, 1);
const DIM = 0.42;

export function PamweLoading({ size = 30 }: { size?: number }) {
  const opacity = useSharedValue(DIM);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 950, easing: settle, reduceMotion: ReduceMotion.System }),
      -1,
      true, // ping-pong, so it eases back down rather than snapping
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <PamweWordmark size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
