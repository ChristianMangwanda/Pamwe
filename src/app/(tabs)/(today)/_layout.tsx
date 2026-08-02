import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

// A partner-submitted push lands on reveal. The anchor keeps Today beneath it.
export const unstable_settings = { initialRouteName: 'index' };

export default function TodayLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reading" />
      <Stack.Screen name="journal" />
      <Stack.Screen name="waiting" />
      <Stack.Screen name="reveal" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
