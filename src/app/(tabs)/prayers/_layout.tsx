import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

export default function PrayersLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="timeline" />
    </Stack>
  );
}
