import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { Spinner } from '../../../components/ui/Spinner';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { haptics } from '../../../lib/haptics';
import { askCoupleChange, pendingRequest, withdrawRequest, CoupleRequest } from '../../../lib/coupleRequests';

// Asking to pause, and then waiting to hear back.
//
// Two states of one screen, because they are one moment: you ask, and then the
// only thing you can do is take it back. Splitting them would put a screen
// between a person and the undo.
export default function PauseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { partner, refresh } = useCouple();
  const [request, setRequest] = useState<CoupleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const partnerName = partner?.display_name?.split(' ')[0] ?? 'your partner';

  useEffect(() => {
    pendingRequest('pause')
      .then(setRequest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ask = async () => {
    setBusy(true);
    try {
      haptics.tap();
      setRequest(await askCoupleChange('pause'));
      await refresh();
    } catch (e: any) {
      Alert.alert("Couldn't ask just now", e?.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!request) return;
    setBusy(true);
    try {
      haptics.tap();
      await withdrawRequest(request.id);
      setRequest(null);
      await refresh();
    } catch (e: any) {
      Alert.alert("Couldn't withdraw that", e?.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink label="You" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={styles.body}><Spinner size={20} color={colors.muted} /></View>
      ) : request ? (
        <>
          <View style={styles.body}>
            <Spinner size={34} color={colors.accent2} />
            <Text variant="h2" style={styles.title}>Asked {partnerName}</Text>
            {/* The waiting state names what has NOT changed, because the
                natural reading of "asked" is that it is done. */}
            <Text italic color={colors.ink2} style={styles.blurb}>
              Nothing changes until {partnerName} agrees. Today is still there, and so are the reminders.
            </Text>
          </View>
          <View style={styles.footer}>
            <Button title="Withdraw the request" variant="secondary" onPress={withdraw} loading={busy} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.body}>
            <SectionEyebrow>Take a break</SectionEyebrow>
            <Text variant="h1" style={styles.title}>Pause Pamwe</Text>
            <Text italic color={colors.ink2} style={styles.blurb}>
              Pages and reminders stop for you both. Your streak stays where it is and starts again from there.
            </Text>
          </View>
          <View style={styles.footer}>
            <Button title={`Ask ${partnerName} to pause`} onPress={ask} loading={busy} />
            <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 8 },
  title: { textAlign: 'center' },
  blurb: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  footer: { paddingBottom: 12, gap: 8 },
});
