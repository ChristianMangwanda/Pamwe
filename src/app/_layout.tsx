import { useEffect } from 'react';
import { Stack } from 'expo-router';
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

import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, savePushToken, scheduleMorningNotification } from '../lib/notifications';

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
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

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
        scheduleMorningNotification(6, 30);
      }
    });
  }, []);

  const handleDeepLink = async (url: string) => {
    const { queryParams } = Linking.parse(url);
    const access_token = queryParams?.access_token as string | undefined;
    const refresh_token = queryParams?.refresh_token as string | undefined;
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
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

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
