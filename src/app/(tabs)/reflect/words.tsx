import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { BookmarkSimple } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getKeptLines, KeptLine } from '../../../lib/entryResponses';
import { haptics } from '../../../lib/haptics';

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// Their Words: every line either of you kept from the other's reflections,
// newest first. The keepsake side of "what stuck with me".
export default function TheirWordsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const [lines, setLines] = useState<KeptLine[]>([]);
  const [loading, setLoading] = useState(true);

  const partnerName = partner?.display_name ?? 'Your partner';

  const load = useCallback(async () => {
    if (!couple?.id) { setLoading(false); return; }
    try { setLines(await getKeptLines(couple.id)); }
    catch { /* keep last good */ }
    finally { setLoading(false); }
  }, [couple?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (l: KeptLine) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/reflect/[id]', params: { id: l.couplePlanId, day: String(l.dayNumber) } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="Reflections" onPress={() => router.back()} />
        <Floral variant="corner" style={styles.floral} />

        <Text variant="h1">Their words</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          The lines that stayed with you.
        </Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : lines.length === 0 ? (
          <View style={styles.empty}>
            <BookmarkSimple size={38} color="#CBB99B" weight="regular" />
            <Text variant="h2" italic style={styles.emptyTitle}>Nothing kept yet</Text>
            <Text color={colors.muted} style={styles.emptyText}>
              When a line in {partnerName}'s reflection stays with you, keep it from the reveal and it will live here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {lines.map((l) => {
              const iKept = l.keeperId === user?.id;
              return (
                <TouchableOpacity key={l.id} activeOpacity={0.85} onPress={() => open(l)}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <Text style={[styles.quote, { color: colors.ink }]}>“{l.body}”</Text>
                  <View style={styles.meta}>
                    <Text style={[styles.metaText, { color: colors.accent2 }]}>
                      {iKept ? `${partnerName}'s words` : `Your words, kept by ${partnerName}`}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.muted }]}>
                      {l.reference ? `${l.reference} · ` : ''}{longDate(l.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 96 },
  floral: { position: 'absolute', top: -10, right: -18, width: 96, height: 96, opacity: 0.55 },
  subtitle: { fontSize: 14, marginTop: 6 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 24 },
  list: { marginTop: 18 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 10 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 26 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 },
  metaText: { fontFamily: fonts.sansMedium, fontSize: 10.5 },
});
