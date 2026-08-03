import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

// A cross-tab push lands on a nested screen here (the Grove's "Browse reading
// plans", Today's "Build a plan", search's jump into a reflection). Without an
// anchor that screen is the stack's ONLY route, its back link falls through to
// the tab bar, and this tab stays stuck on it until the app restarts.
export const unstable_settings = { initialRouteName: 'index' };

export default function PlansLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="builder" />
      <Stack.Screen name="build" />
      <Stack.Screen name="browse" />
      <Stack.Screen name="finished" />
    </Stack>
  );
}
