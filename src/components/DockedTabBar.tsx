import { Pressable, StyleSheet } from 'react-native';
// expo-router 56 vendors react-navigation; these types have no public subpath export.
import type {
  BottomTabBarButtonProps,
  BottomTabNavigationOptions,
} from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { fonts } from '../constants/typography';
import { haptics } from '../lib/haptics';
import { useTheme } from '../providers/ThemeProvider';

// Build 8 (beta round 3): the floating glass oval is gone. Standard docked,
// edge-to-edge, persistent bottom bar. The press scale + tap haptic stay:
// the motion language is kept even though the glass bar is not.
function DockedTabButton({ children, onPress, onLongPress, style, ...rest }: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole={rest.accessibilityRole}
      accessibilityState={rest.accessibilityState}
      accessibilityLabel={rest.accessibilityLabel}
      testID={rest.testID}
      onPress={(e) => {
        haptics.tap();
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withTiming(0.88, { duration: 140 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 140 });
      }}
      style={styles.button}
    >
      <Animated.View style={[styles.buttonInner, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function useDockedTabOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line2,
      height: 54 + insets.bottom,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom - 2, 8),
      paddingHorizontal: 8,
      elevation: 0,
    },
    tabBarButton: (props: BottomTabBarButtonProps) => <DockedTabButton {...props} />,
    tabBarLabelStyle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      letterSpacing: 0.18,
    },
    tabBarIconStyle: {
      marginBottom: 2,
    },
  };
}

const styles = StyleSheet.create({
  button: { flex: 1 },
  buttonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
