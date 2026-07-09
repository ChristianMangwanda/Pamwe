import { useEffect, useState, useCallback } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { getUserCouple } from '../lib/couples';
import { getActiveCouPlan } from '../lib/plans';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

type RouteState = 'loading' | 'auth' | 'unpaired' | 'waiting' | 'plan-select' | 'tabs';

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
      setRoute('unpaired');
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

  if (authLoading || (session && route === 'loading')) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  // No couple yet → start the onboarding funnel (value slides → name → pair).
  if (route === 'unpaired') return <Redirect href="/(onboarding)/value-slides" />;
  // Couple created but partner hasn't joined → the invite screen shows the code + waits.
  if (route === 'waiting') return <Redirect href="/(onboarding)/invite" />;
  if (route === 'plan-select') return <Redirect href="/(onboarding)/plan-select" />;
  return <Redirect href="/(tabs)/(today)" />;
}
