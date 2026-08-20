import type { ReactNode } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { SunHorizon, BookOpen, Books, HandsPraying, Feather, UserCircle } from 'phosphor-react-native';
import { CoupleProvider, useCouple } from '../../providers/CoupleProvider';
import { useAuth } from '../../providers/AuthProvider';
import { usePushRouting } from '../../hooks/usePushRouting';
import { useDockedTabOptions } from '../../components/DockedTabBar';

const ICON_SIZE = 21;

// The couple half of the fence below. A signed-in account with NO couple must
// never sit inside the tabs: every screen here assumes a couple, so the tabs
// render as a trap (Today offers plans that cannot enrol, and nothing on any
// tab can reach pairing). It happened in production on 2026-08-20: a fresh
// magic-link signup landed here through deep-link navigation the auth gate
// never saw, and Sign in with Apple on a couple-less account did the same.
// Sending them to '/' lets the gate decide where they belong (value slides,
// the left screen, or welcome), which is the same division of labour as the
// session fence.
//
// `error` matters: a network blip on the FIRST fetch also leaves couple null
// with loading false, and ejecting a real couple over a blip is the exact bug
// the gate's own error state exists to prevent. When in doubt, stay put.
function CoupleFence({ children }: { children: ReactNode }) {
  const { couple, loading, error } = useCouple();
  if (!loading && !couple && !error) return <Redirect href="/" />;
  return <>{children}</>;
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  usePushRouting();
  const dockedTabOptions = useDockedTabOptions();

  // The app's only auth check used to be src/app/index.tsx, which decides
  // nothing unless you are standing on it. Nothing looked at the session below
  // this point, so once it was gone the six tabs kept rendering exactly as
  // before: prayers still listed, the Bible still readable (its chapter cache
  // is authoritative and never revalidates, so it works with no account at
  // all). Signing out left you inside the app.
  //
  // This is the fence rather than the gate. Returning a Redirect unmounts the
  // whole tree, CoupleProvider included, so nothing goes on fetching for
  // someone who has left.
  if (!loading && !session) return <Redirect href="/(auth)/welcome" />;

  return (
    <CoupleProvider>
      <CoupleFence>
      <Tabs screenOptions={dockedTabOptions}>
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, focused }) => (
              <SunHorizon size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="bible"
          options={{
            title: 'Bible',
            tabBarIcon: ({ color, focused }) => (
              <BookOpen size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="plans"
          options={{
            title: 'Plans',
            tabBarIcon: ({ color, focused }) => (
              <Books size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="prayers"
          options={{
            title: 'Prayers',
            tabBarIcon: ({ color, focused }) => (
              <HandsPraying size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="reflect"
          options={{
            title: 'Reflect',
            tabBarIcon: ({ color, focused }) => (
              <Feather size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ color, focused }) => (
              <UserCircle size={ICON_SIZE} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
      </Tabs>
      </CoupleFence>
    </CoupleProvider>
  );
}
