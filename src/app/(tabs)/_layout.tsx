import { Tabs, Redirect } from 'expo-router';
import { SunHorizon, BookOpen, Books, HandsPraying, Feather, UserCircle } from 'phosphor-react-native';
import { CoupleProvider } from '../../providers/CoupleProvider';
import { useAuth } from '../../providers/AuthProvider';
import { usePushRouting } from '../../hooks/usePushRouting';
import { useDockedTabOptions } from '../../components/DockedTabBar';

const ICON_SIZE = 21;

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
      <Tabs screenOptions={dockedTabOptions}>
        <Tabs.Screen
          name="(today)"
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
    </CoupleProvider>
  );
}
