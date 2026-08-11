import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { useTheme } from '../providers/ThemeProvider';
import { fonts } from '../constants/typography';
import { haptics } from '../lib/haptics';
import { respondToRequest, CoupleRequest } from '../lib/coupleRequests';

interface CoupleRequestCardProps {
  request: CoupleRequest;
  partnerName: string;
  onAnswered: () => void;
}

// Where a partner's ask gets answered.
//
// The handoff draws only the asking side, which leaves the more important half
// undesigned: a request nobody can find is a couple stuck waiting on each other.
// It sits at the top of Today, above the day itself, because agreeing to stop
// and then being shown a reading to do is the app talking over itself.
export function CoupleRequestCard({ request, partnerName, onAnswered }: CoupleRequestCardProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const pausing = request.kind === 'pause';

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      if (accept) haptics.success();
      else haptics.tap();
      await respondToRequest(request.id, accept);
      onAnswered();
    } catch (e: any) {
      Alert.alert("Couldn't answer that", e?.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}>
      <Text variant="eyebrow" color={colors.accent2}>
        {pausing ? 'A pause' : 'Starting again'}
      </Text>
      <Text style={[styles.line, { color: colors.ink }]}>
        {pausing
          ? `${partnerName} has asked to pause Pamwe for a while.`
          : `${partnerName} would like to start reading again.`}
      </Text>
      <Text color={colors.ink2} style={styles.detail}>
        {pausing
          ? 'Pages and reminders stop for you both. Your streak keeps its place.'
          : 'Today comes back, and the streak picks up where it stopped.'}
      </Text>
      <View style={styles.actions}>
        <Button
          title={pausing ? 'Agree to pause' : 'Start again'}
          loading={busy}
          onPress={() => answer(true)}
        />
        <Button title="Not yet" variant="ghost" disabled={busy} onPress={() => answer(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 8, marginBottom: 18 },
  line: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 26 },
  detail: { fontSize: 13, lineHeight: 19 },
  actions: { gap: 8, paddingTop: 8 },
});
