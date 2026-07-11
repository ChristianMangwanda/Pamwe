import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Flower } from 'phosphor-react-native';
import { AskPamweSheet } from './AskPamweSheet';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';

// A quiet, always-there way to reach Ask Pamwe. Deliberately absent from Today
// and the whole reading/journal/waiting/reveal ritual, where silence matters
// most: those paths live under the (today) group. Sits just above the docked
// tab bar, bottom-right, in the app's floral language, never labelled "AI".
const RITUAL_SEGMENTS = ['today', 'reading', 'journal', 'waiting', 'reveal', 'complete'];

export function PamweFab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const onRitual = RITUAL_SEGMENTS.some((seg) => pathname.includes(seg));
  if (onRitual) return null;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(160)}
        style={[styles.wrap, { bottom: 54 + insets.bottom + 14 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { haptics.tap(); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Ask Pamwe"
          style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.ink }]}
        >
          <Flower size={22} color={colors.bg} weight="fill" />
        </TouchableOpacity>
      </Animated.View>
      <AskPamweSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18 },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
