import { Pressable, StyleSheet } from 'react-native';
// expo-router 56 vendors react-navigation; these types have no public subpath export.
import type {
  BottomTabBarButtonProps,
  BottomTabNavigationOptions,
} from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Glass } from './ui/Glass';
import { fonts } from '../constants/typography';
import { haptics } from '../lib/haptics';
import { useTheme } from '../providers/ThemeProvider';

// Design spec (Pamwe App.dc.html L1168–1179): floating bar, margin 0 12px 6px,
// glass bg + 1px glass border, radius 28, icon 24, label 600 9.5px IS ls .02em,
// active accent (ph-fill) / inactive muted (ph), press scale(.88) over 140ms.
function GlassTabButton({ children, onPress, onLongPress, style, ...rest }: BottomTabBarButtonProps) {
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

export function useGlassTabOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      position: 'absolute',
      // Device feedback (iPhone 17 Pro Max): the spec's 12px margins read as a
      // near-full-width slab that clashes with the display's corner radius.
      // Inset more and float clear of the home indicator.
      left: 20,
      right: 20,
      bottom: Math.max(insets.bottom - 6, 10),
      // Shrunk ~17% from the 58px spec after on-device feedback ("too big").
      height: 48,
      borderRadius: 24,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      paddingTop: 7,
      paddingBottom: 5,
      paddingHorizontal: 6,
    },
    tabBarBackground: () => <Glass style={StyleSheet.absoluteFill} />,
    tabBarButton: (props: BottomTabBarButtonProps) => <GlassTabButton {...props} />,
    tabBarLabelStyle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 9,
      letterSpacing: 0.18,
    },
    tabBarIconStyle: {
      marginBottom: 3,
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
