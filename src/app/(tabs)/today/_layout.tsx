import { Stack } from 'expo-router';
import { useTheme } from '../../../providers/ThemeProvider';

// A partner-submitted push lands on reveal. The anchor keeps Today beneath it.
//
// This directory is `today`, NOT `(today)`, and that is load-bearing
// (2026-08-20). Route groups are elided from URLs, so as a group its index.tsx
// resolved to "/", the same URL as the auth gate at src/app/index.tsx. The
// router gave "/" to the tabs, so every router.replace('/') in the app, and
// every cold start, mounted Today directly and the gate never ran at all.
//
// Paired couples never saw it, because for them the gate's answer IS the tabs.
// It broke the moment an account had no couple, which is App Review's signup
// and every real signup at launch: they landed in a tab shell with no route to
// pairing, and once (tabs)/_layout's CoupleFence began ejecting them to "/",
// the two halves looped, tabs to "/" to tabs, several times a second. That
// shipped in build 33.
//
// Un-grouping makes Today "/today" and leaves "/" to the gate alone. It also
// puts this tab in line with the other five, which were always plain
// directories, and makes the widget's own pamwe://today link resolve.
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
