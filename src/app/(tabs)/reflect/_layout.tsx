import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

export default function ReflectLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="words" />
    </Stack>
  );
}
