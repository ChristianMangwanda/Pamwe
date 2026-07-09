import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Floral } from '../../../components/ui/Floral';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { countMySubmittedEntries } from '../../../lib/entries';

export default function CompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan } = useCouple();
  const [reflections, setReflections] = useState<number | null>(null);

  const planTitle = couplePlan?.plan?.title ?? 'your plan';
  const totalDays = couplePlan?.plan?.duration_days ?? couplePlan?.current_day ?? 0;
  const streak = couple?.streak_count ?? 0;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  useEffect(() => {
    if (!couplePlan?.id) return;
    countMySubmittedEntries(couplePlan.id)
      .then(setReflections)
      .catch(() => setReflections(null));
  }, [couplePlan?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="eyebrow" color={colors.muted}>Plan complete</Text>
          <Text variant="hero" style={styles.title}>You finished {planTitle}, together</Text>
          <Text variant="body" color={colors.ink2} style={styles.subtitle}>
            Every day, you both showed up and shared what you saw. That is the whole point.
          </Text>
        </View>

        <Card style={styles.statsCard}>
          <Stat value={String(totalDays)} label={totalDays === 1 ? 'day' : 'days read'} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
          <Stat value={reflections === null ? '—' : String(reflections)} label={reflections === 1 ? 'reflection' : 'reflections'} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
          <Stat value={String(streak)} label="day streak" colors={colors} />
        </Card>

        <Floral variant="divider" style={styles.divider} />

        <View style={styles.footer}>
          <Button title="Choose your next plan" onPress={() => router.replace('/(onboarding)/plan-select')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, colors }: { value: string; label: string; colors: any }) {
  return (
    <View style={styles.stat}>
      <Text variant="hero" color={colors.accent}>{value}</Text>
      <Text variant="label" color={colors.muted} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { marginTop: 8, marginBottom: 16, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  statsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 32 },
  stat: { alignItems: 'center', flex: 1 },
  statLabel: { marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, height: 40 },
  divider: { width: 150, height: 26, alignSelf: 'center', marginVertical: 8, opacity: 0.85 },
  footer: { marginTop: 24 },
});
