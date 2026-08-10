import { useEffect } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const bloom = require('../../assets/images/pamwe-bloom.png');

interface PamweBloomProps {
  /** 'sway' breathes; 'still' just stands there. */
  motion?: 'sway' | 'still';
  /** The waiting and departed screens show it at 0.42, present but receded. */
  faded?: boolean;
  style?: StyleProp<ImageStyle>;
}

// The mark from the onboarding handoff: the Pamwe P with roses growing up it.
// It carries the welcome screen, and it stands in fainter on the screens where
// something is unfinished, waiting for a partner or after a pair has ended.
//
// The sway is slow on purpose (7 seconds there and back, a degree either side)
// and rotates about a point near the base, so the whole thing leans the way a
// stem does rather than spinning about its middle.
export function PamweBloom({ motion = 'sway', faded = false, style }: PamweBloomProps) {
  const reduced = useReducedMotion();
  const lean = useSharedValue(0);

  useEffect(() => {
    if (motion === 'still' || reduced) {
      lean.value = 0;
      return;
    }
    // A beat of stillness first, so the entrance is finished being read before
    // anything starts moving.
    lean.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.Never }),
          withTiming(-1, { duration: 3500, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.Never }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.Never,
      ),
    );
  }, [motion, reduced, lean]);

  const swaying = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${lean.value}deg` },
      { translateY: -3 - lean.value * 3 },
    ],
  }));

  return (
    <Animated.View style={[{ transformOrigin: '50% 88%' }, swaying]}>
      <Image
        source={bloom}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Pamwe"
        style={[{ opacity: faded ? 0.42 : 1 }, style]}
      />
    </Animated.View>
  );
}
