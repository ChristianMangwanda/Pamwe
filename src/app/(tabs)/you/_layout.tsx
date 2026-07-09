import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

export default function YouLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="recaps" />
      <Stack.Screen name="couple" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
