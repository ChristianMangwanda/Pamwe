import { useEffect, useState, useCallback } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { getUserCouple } from '../lib/couples';
import { getActiveCouPlan } from '../lib/plans';
import { View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { PamweLoading } from '../components/ui/PamweLoading';
import { hideSplashOnce } from '../lib/splash';

type RouteState = 'loading' | 'auth' | 'unpaired' | 'waiting' | 'plan-select' | 'tabs' | 'error';

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [route, setRoute] = useState<RouteState>('loading');

  const resolveRoute = useCallback(async (userId: string) => {
    try {
      const couple = await getUserCouple(userId);
      if (!couple) { setRoute('unpaired'); return; }
      if (!couple.paired_at) { setRoute('waiting'); return; }

      const plan = await getActiveCouPlan(couple.id);
      if (!plan) { setRoute('plan-select'); return; }

      setRoute('tabs');
    } catch {
      // Query failure ≠ "no couple". Routing to onboarding here let a paired
      // user create a second couple on a network blip — show a retry instead.
      setRoute('error');
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRoute('loading');
      return;
    }
    setRoute('loading');
    resolveRoute(session.user.id);
  }, [session?.user?.id, resolveRoute]);

  // The gate has landed somewhere real: safe to drop the splash. Anything that
  // renders below this point is a destination, not a waiting state.
  const settled = !authLoading && (!session || route !== 'loading');
  useEffect(() => {
    if (settled) hideSplashOnce();
  }, [settled]);

  if (!settled) {
    // Normally invisible: the native splash is still up. This is what shows if
    // the 3s floor in _layout fires first, so it wears the app's own mark
    // rather than a bare spinner on a blank screen.
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <PamweLoading size={34} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;

  if (route === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <Text variant="h2">Can't reach Pamwe</Text>
        <Text color={colors.ink2} style={{ textAlign: 'center', lineHeight: 22 }}>
          Check your connection, then try again.
        </Text>
        <View style={{ marginTop: 10, alignSelf: 'stretch' }}>
          <Button
            title="Try again"
            onPress={() => {
              setRoute('loading');
              if (session?.user) resolveRoute(session.user.id);
            }}
          />
        </View>
      </View>
    );
  }

  // No couple yet → start the onboarding funnel (value slides → name → pair).
  if (route === 'unpaired') return <Redirect href="/(onboarding)/value-slides" />;
  // Couple created but partner hasn't joined → the invite screen shows the code + waits.
  if (route === 'waiting') return <Redirect href="/(onboarding)/invite" />;
  if (route === 'plan-select') return <Redirect href="/(onboarding)/plan-select" />;
  return <Redirect href="/(tabs)/(today)" />;
}
