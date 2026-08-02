import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

// A notification tap pushes straight into this stack. Without an anchor the
// pushed screen is the stack's only route, so its back link falls through to
// the tab navigator and the You tab stays stuck there until the app restarts.
export const unstable_settings = { initialRouteName: 'index' };

export default function YouLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="recaps" />
      <Stack.Screen name="grove" />
      <Stack.Screen name="couple" />
      <Stack.Screen name="anniversary" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
