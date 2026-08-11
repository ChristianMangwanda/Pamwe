import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PamweBloom } from '../../components/PamweBloom';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { haptics } from '../../lib/haptics';
import { myArchives, archiveSummary, markFarewellRead, ArchiveCouple } from '../../lib/archive';

// After a pair ends, for whichever of the two opens the app next.
//
// The handoff's note on this screen is "no guilt copy", and it is the whole
// brief. Nothing here asks why, nothing suggests fixing it, and the archive is
// offered straight away rather than buried as a consolation. The only forward
// door is starting again with somebody, and it is the quieter of the two.
export default function LeftScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [couple, setCouple] = useState<ArchiveCouple | null>(null);
  const [summary, setSummary] = useState<{ days: number; notes: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const archives = await myArchives().catch(() => []);
      const first = archives[0] ?? null;
      setCouple(first);
      if (!first) return;
      archiveSummary(first.id).then(setSummary).catch(() => {});

      // The note is for the person who did not write it, and only the first
      // time. The database refuses to stamp it for the writer, so showing it
      // here is safe even if this screen is opened by either of them.
      if (first.farewell_note && first.left_by !== user?.id && !first.farewell_read_at) {
        setNote(first.farewell_note);
        markFarewellRead(first.id).catch(() => {});
      }
    })();
  }, [user?.id]);

  const iLeft = couple?.left_by === user?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <PamweBloom motion="still" faded style={styles.bloom} />

        <View style={styles.words}>
          <Text variant="h2" style={styles.title}>
            {iLeft ? 'You left the pair' : 'Your partnership has ended'}
          </Text>
          <Text italic color={colors.ink2} style={styles.blurb}>
            The archive is saved for you both.
          </Text>
        </View>

        {/* Shown once, and then never again. Sitting above the archive row
            because it is the one thing here that is addressed to them. */}
        {note && (
          <Card padding={18} style={styles.noteCard}>
            <Text variant="label" color={colors.muted}>They left you a note</Text>
            <Text variant="journal" style={styles.noteText}>{note}</Text>
          </Card>
        )}

        <View style={[styles.archiveRow, { borderTopColor: colors.line2, borderBottomColor: colors.line2 }]}>
          <View style={styles.archiveLeft}>
            <Text variant="label" color={colors.muted}>Archive</Text>
            <Text variant="h2">
              {summary ? `${summary.days} ${summary.days === 1 ? 'day' : 'days'}, ${summary.notes} ${summary.notes === 1 ? 'note' : 'notes'}` : 'Everything you wrote'}
            </Text>
          </View>
          <Text variant="label" color={colors.muted}>Read only</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Open the archive"
          variant="secondary"
          onPress={() => { haptics.tap(); router.push('/archive'); }}
        />
        <Button
          title="Start again with someone"
          variant="ghost"
          onPress={() => { haptics.tap(); router.replace('/(onboarding)/pair-choice'); }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  bloom: { width: 140, height: 173 },
  words: { alignItems: 'center', gap: 10 },
  title: { textAlign: 'center' },
  blurb: { fontSize: 15, textAlign: 'center' },
  noteCard: { alignSelf: 'stretch', gap: 8 },
  noteText: { lineHeight: 25 },
  archiveRow: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archiveLeft: { gap: 4 },
  footer: { paddingBottom: 12, gap: 8 },
});
