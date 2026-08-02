import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { BackLink } from '../../../components/ui/BackLink';
import { Button } from '../../../components/ui/Button';
import { Floral } from '../../../components/ui/Floral';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { fonts } from '../../../constants/typography';
import { GUTTER, swatches } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { haptics } from '../../../lib/haptics';
import { parseReference } from '../../../lib/bible';
import { getRecap, Recap, RecapPeriod } from '../../../lib/recaps';

const PERIODS = [
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
  { key: 'quarter' as const, label: 'Quarter' },
];

export default function RecapsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [period, setPeriod] = useState<RecapPeriod>('week');
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!couple?.id) { setLoading(false); return; }
    setLoading(true);
    setFailed(false);
    getRecap(couple.id, couple.timezone, period)
      .then((r) => { if (alive) setRecap(r); })
      // A swallowed error used to leave the spinner up for good, which reads as
      // the recap being empty rather than unreachable.
      .catch(() => { if (alive) { setRecap(null); setFailed(true); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [couple?.id, couple?.timezone, period, attempt]);

  const openVerse = useCallback((book: string, chapter: number, verse?: number) => {
    haptics.tap();
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: { book, chapter: String(chapter), ...(verse ? { verse: String(verse) } : {}) },
    } as any);
  }, [router]);

  const openReference = useCallback((reference: string) => {
    const parsed = parseReference(reference);
    if (!parsed?.chapter) return;
    openVerse(parsed.book.name, parsed.chapter, parsed.verse);
  }, [openVerse]);

  const openPrayer = useCallback((prayerId: string) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/prayers', params: { prayerId } } as any);
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Floral variant="corner" style={styles.floral} />
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h1" style={styles.title}>Your recap</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          A look back at what you've walked through together.
        </Text>

        <SegmentedControl segments={PERIODS} value={period} onChange={setPeriod} style={styles.tabs} />

        {loading ? (
          <View style={styles.center}><PamweLoading /></View>
        ) : failed ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.cardBody, { color: colors.ink }]}>
              We couldn't load your recap. Check your connection and try again.
            </Text>
            <Button title="Try again" onPress={() => setAttempt((n) => n + 1)} style={styles.retry} />
          </View>
        ) : !recap ? null : (
          <>
            <Text variant="eyebrow" color={colors.muted} style={styles.range}>{recap.rangeLabel}</Text>
            <Text style={[styles.headline, { color: colors.ink }]}>{recap.headline}</Text>
            {recap.insight && (
              <Text variant="journal" italic color={colors.ink2} style={styles.insight}>{recap.insight}</Text>
            )}

            <View style={styles.stats}>
              <Stat value={recap.days} label="Days read" colors={colors} />
              <Stat value={recap.highlights} label="Highlights" colors={colors} />
              <Stat value={recap.prayers} label="Prayers" colors={colors} />
            </View>

            <Card title="What you read" colors={colors}>
              {recap.readItems.length === 0 ? (
                <Empty text="After a few days of reading together, it shows up here." colors={colors} />
              ) : (
                recap.readItems.map((item) => (
                  <LinkRow key={item.reference} label={item.reference} colors={colors}
                    onPress={() => openReference(item.reference)} />
                ))
              )}
            </Card>

            <Card title="What you marked" colors={colors}>
              {recap.highlightItems.length === 0 ? (
                <Empty text="Highlight a verse while you read and it waits for you here." colors={colors} />
              ) : (
                recap.highlightItems.map((h) => (
                  <LinkRow key={`${h.book}${h.chapter}:${h.verse}`} label={`${h.book} ${h.chapter}:${h.verse}`}
                    dot={swatches[h.color]} colors={colors}
                    onPress={() => openVerse(h.book, h.chapter, h.verse)} />
                ))
              )}
            </Card>

            <Card title="Keep going" colors={colors}>
              <Text style={[styles.cardBody, { color: colors.ink }]}>{recap.encouragement}</Text>
            </Card>

            <Card title="What you prayed for" colors={colors}>
              {recap.prayerItems.length === 0 ? (
                <Empty text={`No new prayers this ${recap.period}.`} colors={colors} />
              ) : (
                recap.prayerItems.map((p) => (
                  <LinkRow key={p.id} label={`“${p.text.length > 90 ? p.text.slice(0, 87) + '…' : p.text}”`}
                    serif colors={colors} onPress={() => openPrayer(p.id)} />
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, colors }: { value: number; label: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.statValue, { color: colors.accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function Card({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.cardTitle, { color: colors.accent2 }]}>{title}</Text>
      {children}
    </View>
  );
}

function Empty({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.cardBody, { color: colors.muted }]}>{text}</Text>;
}

// Every line of a recap names something that still exists: a passage, a verse
// you marked, a prayer you raised. Tapping goes back to it.
function LinkRow({ label, dot, serif, colors, onPress }: {
  label: string; dot?: string; serif?: boolean; colors: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.row, { borderTopColor: colors.line }]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text style={[serif ? styles.rowQuote : styles.rowLabel, { color: colors.ink }]} numberOfLines={2}>{label}</Text>
      <CaretRight size={14} color={colors.accent2} weight="regular" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  floral: { position: 'absolute', top: -6, right: -18, width: 92, height: 92, opacity: 0.55, transform: [{ scaleX: -1 }] },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  tabs: { marginTop: 16 },
  center: { paddingTop: 50, alignItems: 'center' },
  range: { marginTop: 18 },
  headline: { fontFamily: fonts.serifLight, fontSize: 26, lineHeight: 30, marginTop: 6 },
  insight: { fontSize: 15, marginTop: 8 },
  stats: { marginTop: 18, flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  statValue: { fontFamily: fonts.serif, fontSize: 24 },
  statLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  card: { marginTop: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  cardTitle: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  cardBody: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, marginTop: 8 },
  retry: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rowLabel: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 14 },
  rowQuote: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
});
