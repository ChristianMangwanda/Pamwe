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
// tab bar, bottom-right, never labelled "AI".
//
// Build 10 (Christian's b9 feedback: the accent circle "blends into things"):
// a true bubble now. Its own material (surface + crisp border + tight shadow),
// accent flower glyph, and a translucent halo ring so it reads as floating
// above the page instead of belonging to it. Screens it lives on add
// FAB_CLEARANCE to their scroll-end padding so it never covers the last row.
const RITUAL_SEGMENTS = ['today', 'reading', 'journal', 'waiting', 'reveal', 'complete'];

// Scroll-end padding for tabs where the bubble floats: halo (68) + gap.
export const FAB_CLEARANCE = 96;

export function PamweFab() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const onRitual = RITUAL_SEGMENTS.some((seg) => pathname.includes(seg));
  // Plans subroutes (detail, builder) pin their own footer CTA right where the
  // bubble floats; the builder already has Ask Pamwe inside anyway.
  const onOwnFooter = /^\/plans\/.+/.test(pathname);
  if (onRitual || onOwnFooter) return null;

  // The halo is the page background at low opacity: a soft moat that keeps
  // the bubble visually separated from whatever scrolls behind it.
  const halo = mode === 'dark' ? 'rgba(23, 18, 14, 0.55)' : 'rgba(239, 230, 214, 0.55)';

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
          style={[styles.halo, { backgroundColor: halo }]}
        >
          <Animated.View style={[styles.fab, {
            backgroundColor: colors.surface,
            borderColor: colors.accent2,
            shadowColor: colors.ink,
          }]}>
            <Flower size={24} color={colors.accent} weight="fill" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
      <AskPamweSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16 },
  halo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
