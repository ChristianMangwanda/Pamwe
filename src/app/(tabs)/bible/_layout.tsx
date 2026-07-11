import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

export default function BibleStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[book]" />
      <Stack.Screen name="[book]/[chapter]" />
      <Stack.Screen name="marks" />
      <Stack.Screen name="search" />
      <Stack.Screen name="note" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
