import { Stack } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="value-slides" />
      <Stack.Screen name="name" />
      <Stack.Screen name="pair-choice" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="join" />
      <Stack.Screen name="connected" />
      <Stack.Screen name="waiting" />
      <Stack.Screen name="plan-select" />
    </Stack>
  );
}
