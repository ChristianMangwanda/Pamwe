import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Heart } from 'phosphor-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { thinkingOfYou } from '../lib/notifications';

// One tap that carries nothing to do: it tells your partner you're thinking of
// them, and that's the whole feature.
//
// This started as a floating bubble bottom-left, mirroring Ask Pamwe. That was
// wrong for Today: the primary action here is a full-width button at the bottom
// of a scrolling page, so a floating element sat on top of "Read Day N" partway
// through any scroll. It now sits INLINE next to that button, where it can
// never obstruct anything and reads as the companion action it is.
export function ThinkingButton() {
  const { colors } = useTheme();
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

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={sending}
      accessibilityRole="button"
      accessibilityLabel={
        sent ? 'Already told them you are thinking of them' : 'Tell your partner you are thinking of them'
      }
      style={[styles.button, {
        backgroundColor: sent ? colors.accent : colors.surface,
        borderColor: sent ? colors.accent : colors.accent2,
      }]}
    >
      {sending
        ? <ActivityIndicator color={colors.accent} />
        : <Heart size={23} color={sent ? colors.bg : colors.accent} weight={sent ? 'fill' : 'regular'} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Height matches the CTA button beside it (17pt padding + cta line height).
  button: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
