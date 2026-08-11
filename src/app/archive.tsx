import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { BackLink } from '../components/ui/BackLink';
import { StripedBanner } from '../components/ui/StripedBanner';
import { PamweLoading } from '../components/ui/PamweLoading';
import { GUTTER } from '../theme/tokens';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { haptics } from '../lib/haptics';
import { getProfile } from '../lib/couples';
import {
  myArchives, archiveEntries, archiveSummary, exportText,
  ArchiveCouple, ArchiveEntry,
} from '../lib/archive';

// What is left after a pair ends. Read only, dated, and nobody's to change.
//
// Top level rather than inside the tabs, because the person reading it has no
// couple: the tab shell mounts CoupleProvider and every screen in it assumes a
// partner. This has neither and needs neither.
export default function ArchiveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [couple, setCouple] = useState<ArchiveCouple | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [summary, setSummary] = useState<{ days: number; notes: number } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const archives = await myArchives();
        const first = archives[0] ?? null;
        setCouple(first);
        if (!first) return;
        const [rows, sum] = await Promise.all([
          archiveEntries(first.id),
          archiveSummary(first.id).catch(() => ({ days: 0, notes: 0 })),
        ]);
        setEntries(rows);
        setSummary(sum);

        // Named, not "you and them": these are two people's words sitting side
        // by side and a copy kept for years should say whose is whose.
        const ids = Array.from(new Set(rows.map((r) => r.user_id)));
        const profiles = await Promise.all(ids.map((id) => getProfile(id).catch(() => null)));
        setNames(Object.fromEntries(
          ids.map((id, i) => [id, profiles[i]?.display_name ?? (id === user?.id ? 'You' : 'Your partner')]),
        ));
      } catch {
        // An archive that cannot be read is not an archive that is gone; the
        // empty state below says so rather than claiming it was lost.
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const onExport = async () => {
    if (!couple) return;
    haptics.tap();
    try {
      await Share.share({ message: exportText(entries, names, couple.left_at) });
    } catch (e: any) {
      Alert.alert("Couldn't export", e?.message ?? 'Try again in a moment.');
    }
  };

  const sealed = couple?.left_at
    ? new Date(couple.left_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }).toUpperCase()
    : '';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><PamweLoading /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink onPress={() => router.back()} />
      </View>

      {!couple ? (
        <View style={styles.center}>
          <Text variant="h2" italic style={styles.centerTitle}>Nothing archived</Text>
          <Text color={colors.ink2} style={styles.centerText}>
            An archive appears here when a partnership ends.
          </Text>
        </View>
      ) : (
        <>
          <StripedBanner height={38} radius={10} style={styles.banner}>
            <View style={styles.bannerInner}>
              <View style={[styles.pill, { backgroundColor: colors.surface }]}>
                <Text variant="chip" color={colors.ink}>Read only, sealed {sealed}</Text>
              </View>
            </View>
          </StripedBanner>

          <View style={styles.counts}>
            <Text variant="h2">{summary?.days ?? 0} {summary?.days === 1 ? 'day' : 'days'}</Text>
            <Text variant="label" color={colors.muted}>
              {summary?.notes ?? 0} {summary?.notes === 1 ? 'note' : 'notes'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {entries.length === 0 ? (
              <Text color={colors.ink2} style={styles.centerText}>
                Nothing was written before this ended.
              </Text>
            ) : entries.map((e) => (
              <View key={e.id} style={[styles.entry, { borderTopColor: colors.line2 }]}>
                <Text variant="label" color={colors.muted}>
                  {new Date(e.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  {'  ·  '}
                  {names[e.user_id] ?? 'Someone'}
                </Text>
                <Text variant="journal" style={styles.entryText}>
                  {e.text_content?.trim() || e.transcript?.trim() || 'A voice reflection.'}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Export a copy" variant="dashed" onPress={onExport} disabled={entries.length === 0} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  centerTitle: { textAlign: 'center' },
  centerText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  banner: { width: '100%', marginTop: 6 },
  bannerInner: { height: 38, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: 99, paddingVertical: 5, paddingHorizontal: 14 },
  counts: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18 },
  scroll: { paddingBottom: 20 },
  entry: { borderTopWidth: 1, paddingVertical: 16, gap: 6 },
  entryText: { lineHeight: 25 },
  footer: { paddingBottom: 12, paddingTop: 6 },
});
