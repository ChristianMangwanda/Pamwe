import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Sentry from '@sentry/react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

// The app had NO error boundary anywhere, which is why a screen could break
// with nothing to show for it.
//
// expo-router wraps a route in its `Try` boundary only if that route exports an
// `ErrorBoundary` (see useScreens.js `fromImport`), and no route did. So a
// render error had nothing to catch it, React unmounted the tree, and the app
// went to a dead screen that only a restart could clear. Nothing on screen said
// what happened, and nothing deliberately told Sentry.
//
// Exported from the ROOT layout, so it sits above every screen: a React error
// boundary catches anything thrown below it, wherever in the tree that is.
//
// It CANNOT use useTheme(). The boundary wraps the root layout component, so
// when that layout is the thing that failed, ThemeProvider is not mounted and
// any hook into it would throw inside the boundary itself, which is how a
// broken screen becomes an unrecoverable one. It uses the frozen light palette
// for the same reason the pre-auth screens do.
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    // Explicit, because a caught error is not an uncaught one: React swallows
    // it at the boundary, so the global handler Sentry patches never sees it.
    Sentry.captureException(error, { tags: { boundary: 'route' } });
  }, [error]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>This screen stopped</Text>
        <Text style={styles.body}>
          Nothing you wrote is lost. Reflections save as you type, and everything else lives on the server.
        </Text>
        <Text style={styles.body}>
          It has been reported. Try again, and if it keeps happening the line below is the part worth sending on.
        </Text>

        {/* The message is on screen deliberately: a beta tester who can read it
            can report it, and this app's testers are its developer and his
            partner. */}
        <View style={styles.detail}>
          <Text style={styles.detailText} selectable>{describe(error)}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={retry} accessibilityRole="button">
          <Text style={styles.buttonLabel}>Try again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/**
 * The one line worth sending on.
 *
 * `String(error)` was the obvious fallback and it is a trap: anything thrown
 * that is not an Error renders as "[object Object]", which tells a tester
 * nothing and looks like a second bug. A thrown string still comes through,
 * because that is genuinely the message.
 */
function describe(error: unknown): string {
  if (typeof error === 'string' && error) return error;
  const message = (error as Error | null)?.message;
  return typeof message === 'string' && message ? message : 'Unknown error';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 60 },
  title: { fontFamily: fonts.serifLight, fontSize: 30, color: colors.text, textAlign: 'center' },
  body: {
    fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, color: colors.textMuted,
    textAlign: 'center', marginTop: 14,
  },
  detail: {
    backgroundColor: colors.surface, borderColor: colors.stroke, borderWidth: 1,
    borderRadius: 12, padding: 14, marginTop: 22,
  },
  detailText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  button: {
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 26,
  },
  buttonLabel: {
    fontFamily: fonts.sansSemiBold, fontSize: 13, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.bg,
  },
});
