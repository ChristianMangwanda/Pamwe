import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Heart } from 'phosphor-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { thinkingOfYou } from '../lib/notifications';

// One tap that carries nothing to do: it tells your partner you're thinking of
// them, and that's the whole feature. Lives bottom-LEFT on Today, mirroring the
// Ask Pamwe bubble's material (halo + surface bubble + accent border) on the
// opposite side. Ask Pamwe deliberately never appears on Today, so the two
// bubbles are never on screen together.
//
// Mounted by the Today screen itself rather than the tabs layout, so it can't
// leak into the reading/journal/reveal ritual where silence matters.
export function ThinkingFab() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onPress = async () => {
    if (sending || sent) return;
    haptics.medium();
    setSending(true);
    const res = await thinkingOfYou();
    setSending(false);
    if (res.ok) {
      setSent(true);
      haptics.success();
      // Say plainly when it was logged but no banner could land, rather than
      // implying it buzzed their phone.
      if (!res.delivered) {
        Alert.alert('Sent', "They have notifications off, so it won't buzz their phone.");
      }
    } else if (res.cooldown) {
      setSent(true);
      Alert.alert('Already sent', res.message ?? 'You just sent one.');
    } else {
      Alert.alert("Couldn't send that", res.message ?? 'Try again in a moment.');
    }
  };

  const halo = mode === 'dark' ? 'rgba(23, 18, 14, 0.55)' : 'rgba(239, 230, 214, 0.55)';

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      style={[styles.wrap, { bottom: 54 + insets.bottom + 14 }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={sending}
        accessibilityRole="button"
        accessibilityLabel={sent ? 'Already told them you are thinking of them' : 'Tell your partner you are thinking of them'}
        style={[styles.halo, { backgroundColor: halo }]}
      >
        <Animated.View style={[styles.fab, {
          backgroundColor: sent ? colors.accent : colors.surface,
          borderColor: colors.accent2,
          shadowColor: colors.ink,
          opacity: sending ? 0.6 : 1,
        }]}>
          <Heart size={24} color={sent ? colors.bg : colors.accent} weight={sent ? 'fill' : 'regular'} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16 },
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
