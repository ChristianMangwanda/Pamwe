import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { StripedBanner } from './ui/StripedBanner';
import { PamweBloom } from './PamweBloom';
import { GUTTER } from '../theme/tokens';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { askCoupleChange, withdrawRequest, CoupleRequest } from '../lib/coupleRequests';

interface PausedTodayProps {
  pausedAt: string;
  streak: number;
  partnerName: string;
  /** An open restart ask, whoever made it. */
  restartRequest: CoupleRequest | null;
  mine: boolean;
  onChanged: () => void;
}

function pausedOn(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }).toUpperCase();
}

// Today, while the two of you have stopped.
//
// It states the streak as a number rather than implying it survived, which is
// the handoff's note on this screen and the right instinct: "your streak is
// safe" is the kind of reassurance nobody believes. Saying "starts again at 9"
// is checkable.
export function PausedToday({
  pausedAt, streak, partnerName, restartRequest, mine, onChanged,
}: PausedTodayProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    try {
      haptics.tap();
      await fn();
      onChanged();
    } catch (e: any) {
      Alert.alert(failure, e?.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StripedBanner height={38} radius={10} style={styles.banner}>
        <View style={styles.bannerInner}>
          <View style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Text variant="chip" color={colors.ink}>Paused {pausedOn(pausedAt)}</Text>
          </View>
        </View>
      </StripedBanner>

      <View style={styles.body}>
        <PamweBloom motion="still" faded style={styles.bloom} />
        <View style={styles.words}>
          <Text variant="h2" style={styles.title}>
            {streak > 0 ? `Day ${streak} is saved` : 'Everything is saved'}
          </Text>
          <Text italic color={colors.ink2} style={styles.blurb}>
            No pages and no reminders.
            {streak > 0 ? ` Your streak starts again at ${streak}.` : ''}
          </Text>
        </View>

        <View style={styles.actions}>
          {restartRequest ? (
            mine ? (
              <>
                <Text color={colors.ink2} style={styles.pending}>
                  Waiting for {partnerName} to agree.
                </Text>
                <Button
                  title="Withdraw the request"
                  variant="secondary"
                  loading={busy}
                  onPress={() => act(() => withdrawRequest(restartRequest.id), "Couldn't withdraw that")}
                />
              </>
            ) : (
              // Answering lives on the card in Today's header, so this only
              // says who is waiting on whom.
              <Text color={colors.ink2} style={styles.pending}>
                {partnerName} has asked to start again.
              </Text>
            )
          ) : (
            <Button
              title={`Ask ${partnerName} to restart`}
              loading={busy}
              onPress={() => act(() => askCoupleChange('restart'), "Couldn't ask just now")}
            />
          )}
          <Button
            title="Read old notes"
            variant="ghost"
            onPress={() => router.push('/(tabs)/reflect')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 8 },
  banner: { width: '100%' },
  bannerInner: { height: 38, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 99, paddingVertical: 5, paddingHorizontal: 14 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  bloom: { width: 150, height: 169 },
  words: { alignItems: 'center', gap: 10 },
  title: { textAlign: 'center' },
  blurb: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  actions: { alignSelf: 'stretch', gap: 8, paddingTop: 8 },
  pending: { fontSize: 14, textAlign: 'center', paddingBottom: 4 },
});
