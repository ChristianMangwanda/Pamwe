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
      {/* fullScreenModal, not modal: KeyboardAvoidingView measures its frame
          relative to its parent while the keyboard reports in window
          coordinates. In a page-sheet those differ by the sheet's top inset,
          so it under-padded and the keyboard sat over the note. */}
      <Stack.Screen name="note" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
