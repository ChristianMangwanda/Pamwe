import { useEffect } from 'react';
import { CircleNotch } from 'phosphor-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';

// The design's `spin` keyframe: circle-notch rotating 1s linear infinite.
export function Spinner({ size = 17, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1);
  }, [rot]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Animated.View style={style}>
      <CircleNotch size={size} color={color ?? colors.muted} weight="bold" />
    </Animated.View>
  );
}
