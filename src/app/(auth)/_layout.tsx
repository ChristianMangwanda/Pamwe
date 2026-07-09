import { Stack } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="magic-link" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
