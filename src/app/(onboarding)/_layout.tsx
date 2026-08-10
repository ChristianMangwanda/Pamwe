import { Stack, Redirect } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();

  // The same fence as (tabs). Onboarding carries a name, an invite code and a
  // partner's join, none of which mean anything without a session behind them.
  if (!loading && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="value-slides" />
      <Stack.Screen name="name" />
      <Stack.Screen name="pair-choice" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="join" />
      <Stack.Screen name="connected" />
      <Stack.Screen name="plan-select" />
    </Stack>
  );
}
