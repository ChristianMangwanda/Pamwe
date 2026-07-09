import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChartLineUp } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { NotificationPreview } from '../../../components/NotificationPreview';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
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

  useEffect(() => {
    let alive = true;
    if (!couple?.id) { setLoading(false); return; }
    setLoading(true);
    getRecap(couple.id, couple.timezone, period)
      .then((r) => { if (alive) setRecap(r); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [couple?.id, couple?.timezone, period]);

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

        {loading || !recap ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : (
          <>
            <Text variant="eyebrow" color={colors.muted} style={styles.range}>{recap.rangeLabel}</Text>
            <Text style={[styles.headline, { color: colors.ink }]}>{recap.headline}</Text>

            <View style={styles.stats}>
              <Stat value={recap.days} label="Days read" colors={colors} />
              <Stat value={recap.highlights} label="Highlights" colors={colors} />
              <Stat value={recap.prayers} label="Prayers" colors={colors} />
            </View>

            <RecapCard title="What you read" body={recap.read} colors={colors} />
            <RecapCard title="What you learned" body={recap.learned} colors={colors} />
            <RecapCard title="What you prayed for" body={recap.pray} colors={colors} />

            <Text variant="eyebrow" color={colors.muted} style={styles.sent}>Sent to you both</Text>
            <NotificationPreview
              icon={<ChartLineUp size={20} color={colors.bg} weight="fill" />}
              line={`Your ${recap.period} together is ready 🌿`}
              subline={recap.headline}
            />
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

function RecapCard({ title, body, colors }: { title: string; body: string; colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.cardTitle, { color: colors.accent2 }]}>{title}</Text>
      <Text style={[styles.cardBody, { color: colors.ink }]}>{body}</Text>
    </View>
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
  stats: { marginTop: 18, flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  statValue: { fontFamily: fonts.serif, fontSize: 24 },
  statLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  card: { marginTop: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  cardTitle: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  cardBody: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, marginTop: 8 },
  sent: { marginTop: 20, marginBottom: 8 },
});
