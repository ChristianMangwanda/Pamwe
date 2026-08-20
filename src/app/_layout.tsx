import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Sentry from '@sentry/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { supabase } from '../lib/supabase';
import { hideSplashOnce } from '../lib/splash';
import { PENDING_INVITE_KEY } from '../lib/invite';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Crash reporting is a no-op until EXPO_PUBLIC_SENTRY_DSN is set
// (requires a Sentry account + a dev-client rebuild for the native module).
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, sendDefaultPii: false });
}

// Module-scope: runs once when the bundle loads.
// webClientId is what Supabase validates the ID token against; iosClientId
// identifies the app to Google on device.
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

function RootStack() {
  const { colors } = useTheme();
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  // Do NOT hide the splash the instant fonts land: the auth gate still has a
  // token refresh plus 2-3 queries to go, and dropping the splash there is what
  // exposed the spinner and the welcome-screen flash. src/app/index.tsx hides it
  // when it has actually resolved a destination. This timeout is only a floor,
  // so a hung query can never strand anyone on the splash.
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const timer = setTimeout(hideSplashOnce, 3000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

  // Push registration is auth-scoped and lives in AuthProvider — a cold-launch
  // registration here ran before any sign-in existed, so a first session never
  // saved its token (and the reminder was reset to a hardcoded 06:30).

  const handleDeepLink = async (url: string) => {
    // Supabase magic links deliver the session in the URL *fragment*
    // (#access_token=...) or as ?code= (PKCE). Linking.parse only surfaces
    // query params, so parse the fragment ourselves and handle both.
    const { queryParams } = Linking.parse(url);
    const fragParams = new URLSearchParams(url.split('#')[1] ?? '');
    const access_token =
      (queryParams?.access_token as string | undefined) ?? fragParams.get('access_token') ?? undefined;
    const refresh_token =
      (queryParams?.refresh_token as string | undefined) ?? fragParams.get('refresh_token') ?? undefined;
    const code = queryParams?.code as string | undefined;

    // A pairing link (pamwe://join?code=ABC123). Stashed rather than followed,
    // because the tap usually arrives before there is an account: the invited
    // partner is by definition someone who has not signed in yet. join.tsx
    // picks it up when the gate finally lands them there.
    //
    // Deliberately checked before the auth branches below and returned from:
    // an invite code is not a magic-link code, and `?code=` means both.
    const invite = queryParams?.invite as string | undefined;
    if (invite) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, String(invite).toUpperCase()).catch(() => {});
      const { data: { session } } = await supabase.auth.getSession();
      // Already signed in and unpaired: take them straight there. Otherwise the
      // gate routes through welcome and join.tsx reads the stash on arrival.
      if (session) router.replace('/(onboarding)/join');
      return;
    }

    // Auth-carrying URLs only, from here down. A widget tap (pamwe://today,
    // pamwe://bible/...) or a plan link carries none of these and must keep
    // its own navigation.
    if (!access_token && !code) return;

    try {
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    } catch {
      // Malformed or expired link. Fall through: the gate lands them signed
      // out at welcome, which beats leaving them wherever iOS opened the app.
    }

    // Route through the gate NO MATTER how the token exchange went, and never
    // let the dismiss stop it. The old shape gated replace('/') behind a
    // successful exchange AND an un-guarded dismissAll, so any failure left
    // the user parked on whatever screen the deep link natively mounted. On
    // 2026-08-20 that was the TABS, for a brand-new couple-less signup: the
    // navigation the URL itself triggered was never corrected, and the account
    // was stuck in a tab shell it could not pair from. The tabs layout now
    // fences that state too; this is the other half.
    try {
      // The "check your email" modal stays natively presented over a
      // replaced stack — dismiss it before navigating.
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // Nothing presented — fine.
    }
    router.replace('/');
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// expo-router only installs an error boundary for a route that exports one, so
// until this existed a render error anywhere unmounted the tree to a dead
// screen and told nobody. Exported from the root layout, it sits above every
// screen in the app.
export { RouteErrorBoundary as ErrorBoundary } from '../components/RouteErrorBoundary';

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
