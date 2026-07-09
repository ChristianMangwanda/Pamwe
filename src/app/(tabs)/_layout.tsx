import { Tabs } from 'expo-router';
import { SunHorizon, BookOpen, Books, HandsPraying, Feather, UserCircle } from 'phosphor-react-native';
import { CoupleProvider } from '../../providers/CoupleProvider';
import { usePushRouting } from '../../hooks/usePushRouting';
import { useGlassTabOptions } from '../../components/GlassTabBar';

const ICON_SIZE = 24;

export default function TabLayout() {
  usePushRouting();
  const glassTabOptions = useGlassTabOptions();

  return (
    <CoupleProvider>
      <Tabs screenOptions={glassTabOptions}>
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
