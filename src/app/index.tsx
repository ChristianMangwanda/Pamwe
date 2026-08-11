import { useEffect, useState, useCallback } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../providers/AuthProvider';
import { getUserCouple } from '../lib/couples';
import { getActiveCouPlan } from '../lib/plans';
import { myArchives } from '../lib/archive';
import { View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { PamweLoading } from '../components/ui/PamweLoading';
import { hideSplashOnce } from '../lib/splash';

type RouteState = 'loading' | 'auth' | 'unpaired' | 'left' | 'waiting' | 'plan-select' | 'tabs' | 'error';

// Where this account landed last time. Only 'tabs' is ever remembered, because
// it is the only destination that stays true for months: the four onboarding
// states are steps someone is passing through, and guessing one of those wrong
// puts a stranger's screen in front of them.
//
// Account-scoped and under the `pamwe:` prefix, so signing out clears it with
// everything else (see lib/localData.ts).
const rememberedKey = (uid: string) => `pamwe:lastRoute:${uid}`;

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [route, setRoute] = useState<RouteState>('loading');

  const resolveRoute = useCallback(async (userId: string) => {
    try {
      const couple = await getUserCouple(userId);
      if (!couple) {
        // No couple is two different situations. Somebody who has just left a
        // partnership of a hundred and fifty days is not a new user, and
        // dropping them into the value slides would be the app pretending none
        // of it happened.
        const archives = await myArchives().catch(() => []);
        setRoute(archives.length > 0 ? 'left' : 'unpaired');
        return;
      }
      if (!couple.paired_at) { setRoute('waiting'); return; }

      const plan = await getActiveCouPlan(couple.id);
      if (!plan) { setRoute('plan-select'); return; }

      setRoute('tabs');
      AsyncStorage.setItem(rememberedKey(userId), 'tabs').catch(() => {});
    } catch {
      // Query failure ≠ "no couple". Routing to onboarding here let a paired
      // user create a second couple on a network blip — show a retry instead.
      setRoute('error');
    }
  }, []);

  // Anything that is not a reading couple stops being remembered, so a plan
  // that ended, or a pair that ended, cannot keep opening Today.
  useEffect(() => {
    if (!session?.user) return;
    if (route === 'unpaired' || route === 'left' || route === 'waiting' || route === 'plan-select') {
      AsyncStorage.removeItem(rememberedKey(session.user.id)).catch(() => {});
    }
  }, [route, session?.user?.id]);

  useEffect(() => {
    if (!session?.user) {
      setRoute('loading');
      return;
    }
    const uid = session.user.id;
    let live = true;
    setRoute('loading');

    // The gate cannot route until getSession, then getUserCouple, then
    // getActiveCouPlan have all come back, and the last two are strictly
    // sequential because the plan is looked up by couple. On a slow radio that
    // is several seconds spent on the splash, and the 3s floor in _layout then
    // drops the app onto colors.bg, which in dark mode is #17120E: a screen
    // that reads as broken rather than busy.
    //
    // A couple who were reading yesterday are reading today. Show them that at
    // once and let the queries confirm it behind them; on the rare miss the
    // answer above replaces this a moment later.
    AsyncStorage.getItem(rememberedKey(uid))
      .then((v) => {
        if (live && v === 'tabs') setRoute((r) => (r === 'loading' ? 'tabs' : r));
      })
      .catch(() => {});

    resolveRoute(uid);
    return () => { live = false; };
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
  // Left a partnership, and has not started another. The archive lives here.
  if (route === 'left') return <Redirect href="/(onboarding)/left" />;
  // Couple created but partner hasn't joined → the invite screen shows the code + waits.
  if (route === 'waiting') return <Redirect href="/(onboarding)/invite" />;
  if (route === 'plan-select') return <Redirect href="/(onboarding)/plan-select" />;
  return <Redirect href="/(tabs)/(today)" />;
}
