import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { SealCheck, Flower } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { CategoryChip } from '../../../components/ui/CategoryChip';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getAnsweredPrayers } from '../../../lib/prayers';
import { Prayer } from '../../../components/PrayerCard';

function longDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Rough "carried for N days" between asking and answer.
function carried(from?: string | null, to?: string | null): string {
  if (!from || !to) return '';
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));
  if (days < 7) return `Carried ${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 30) { const w = Math.round(days / 7); return `Carried ${w} ${w === 1 ? 'week' : 'weeks'}`; }
  const m = Math.round(days / 30);
  return `Carried ${m} ${m === 1 ? 'month' : 'months'}`;
}

// The faithfulness timeline: every answered prayer as a small journey, from the
// day it was first carried to the day it was answered, newest at the top. The
// emotional payoff of the whole prayer feature, gathered in one place.
export default function PrayerTimelineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const [items, setItems] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  const partnerName = partner?.display_name ?? 'your partner';

  const load = useCallback(async () => {
    if (!couple?.id) { setLoading(false); return; }
    try { setItems((await getAnsweredPrayers(couple.id)) as Prayer[]); }
    catch { /* keep last good */ }
    finally { setLoading(false); }
  }, [couple?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="Prayers" onPress={() => router.back()} />
        <Floral variant="corner" style={styles.floral} />

        <Text variant="h1">Answered</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          A record of His faithfulness, together.
        </Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <SealCheck size={38} color="#CBB99B" weight="regular" />
            <Text variant="h2" italic style={styles.emptyTitle}>Nothing answered yet</Text>
            <Text color={colors.muted} style={styles.emptyText}>
              When you mark a prayer answered, it will be gathered here as part of your story.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {items.map((p, i) => (
              <View key={p.id} style={styles.row}>
                <View style={styles.rail}>
                  <View style={[styles.node, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                    <Flower size={11} color={colors.bg} weight="fill" />
                  </View>
                  {i < items.length - 1 && <View style={[styles.line, { backgroundColor: colors.line2 }]} />}
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.answeredOn, { color: colors.accent }]}>Answered {longDate(p.answered_at ?? p.created_at)}</Text>
                    <CategoryChip category={p.category} />
                  </View>
                  <Text style={[styles.prayerText, { color: colors.ink }]}>{p.text}</Text>
                  {!!p.answer_note && (
                    <View style={[styles.note, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                      <Text style={[styles.noteText, { color: colors.ink }]}>{p.answer_note}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={[styles.meta, { color: colors.muted }]}>
                      {p.author_id === user?.id ? 'You asked' : `${partnerName} asked`} · {longDate(p.created_at)}
                    </Text>
                    {carried(p.created_at, p.answered_at) ? (
                      <Text style={[styles.meta, { color: colors.accent2 }]}>{carried(p.created_at, p.answered_at)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  floral: { position: 'absolute', top: -10, right: -18, width: 96, height: 96, opacity: 0.55, transform: [{ scaleX: -1 }] },
  subtitle: { fontSize: 14, marginTop: 6 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 24 },
  timeline: { marginTop: 20 },
  row: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  card: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  answeredOn: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  prayerText: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, marginTop: 10 },
  note: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 11 },
  noteText: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 },
  meta: { fontFamily: fonts.sansMedium, fontSize: 10.5 },
});
