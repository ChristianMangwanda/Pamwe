import { useEffect, useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BackLink } from '../../components/ui/BackLink';
import { PamweBloom } from '../../components/PamweBloom';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';
import { getUserCouple } from '../../lib/couples';
import { inviteMessage } from '../../lib/invite';
import { useAwaitPairing } from '../../hooks/useAwaitPairing';

// The code has gone; there is nothing to do but wait for it to be typed.
//
// This used to be a spinner at the bottom of the invite screen, under the code,
// the copy button, the share button and the QR toggle. The handoff gives it a
// screen with exactly one action on it, which is the honest amount: sending the
// code again is the only thing that can help, and every other control on the
// invite screen was a way of sending it for the first time.
export default function WaitingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const couple = await getUserCouple();
      if (!couple) return router.replace('/');
      // They joined while this screen was opening.
      if (couple.paired_at) return router.replace('/(onboarding)/connected');
      setCode(couple.invite_code);
      setCoupleId(couple.id);
    })();
  }, [router]);

  useAwaitPairing(coupleId);

  const sendAgain = async () => {
    if (!code) return;
    haptics.tap();
    await Share.share({ message: inviteMessage(code) });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink label="Your code" onPress={() => router.back()} />
      </View>

      <View style={styles.body}>
        <PamweBloom faded style={styles.bloom} />
        <Text variant="h2" style={styles.title}>Waiting for your partner</Text>
        <Text italic color={colors.ink2} style={styles.subtitle}>
          Just waiting for them to join…
        </Text>
      </View>

      <View style={styles.footer}>
        <Button title="Send the code again" onPress={sendAgain} disabled={!code} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 14 },
  bloom: { width: 170, height: 187 },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center' },
  footer: { paddingBottom: 12 },
});
