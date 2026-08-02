import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Floral } from '../../../components/ui/Floral';
import { StreakTree } from '../../../components/ui/StreakTree';
import { currentAward, nextAward } from '../../../lib/treeAwards';
import { word } from '../../../lib/grove';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { countMySubmittedEntries } from '../../../lib/entries';
import { finishedPlanCount } from '../../../lib/planHistory';
import { enrollInPlan, Cadence } from '../../../lib/plans';
import { haptics } from '../../../lib/haptics';

export default function CompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan, refresh: refreshCouple } = useCouple();
  // A just-completed plan is no longer the active plan, so callers pass what
  // to celebrate (title/days/cpId); the active plan stays as a fallback. This
  // is what lets the manual "Mark plan complete" path reach this moment too.
  const params = useLocalSearchParams<{ title?: string; days?: string; cpId?: string; planId?: string; cadence?: string }>();
  const [reflections, setReflections] = useState<number | null>(null);
  const [finishedPlans, setFinishedPlans] = useState<number | null>(null);
  const [retaking, setRetaking] = useState(false);

  const planTitle = params.title || couplePlan?.plan?.title || 'your plan';
  const totalDays = Number(params.days) || couplePlan?.plan?.duration_days || couplePlan?.current_day || 0;
  const streak = couple?.streak_count ?? 0;
  const entriesFrom = params.cpId || couplePlan?.id;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  useEffect(() => {
    if (!entriesFrom) return;
    countMySubmittedEntries(entriesFrom)
      .then(setReflections)
      .catch(() => setReflections(null));
  }, [entriesFrom]);

  // The tree grows with plans finished, not days read. This is the one screen
  // where it means something: it moved here because on Today it sat beside the
  // streak bar saying the same thing twice.
  useEffect(() => {
    if (!couple?.id) return;
    finishedPlanCount(couple.id).then(setFinishedPlans).catch(() => {});
  }, [couple?.id]);

  const retake = async () => {
    if (!couple?.id || !params.planId || retaking) return;
    setRetaking(true);
    try {
      const cadence = (Number(params.cadence) || 1) as Cadence;
      await enrollInPlan(couple.id, params.planId, cadence);
      await refreshCouple();
      haptics.success();
      router.replace('/(tabs)/(today)');
    } catch (e: any) {
      setRetaking(false);
      Alert.alert("Couldn't start it again", e?.message ?? 'Try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="eyebrow" color={colors.muted}>Plan complete</Text>
          <Text variant="hero" style={styles.title}>You finished {planTitle}, together</Text>
          <Text variant="body" color={colors.ink2} style={styles.subtitle}>
            Day after day, you both showed up and said what you saw. That is the whole point.
          </Text>
        </View>

        <Card style={styles.statsCard}>
          <Stat value={String(totalDays)} label={totalDays === 1 ? 'day' : 'days read'} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
          <Stat value={reflections === null ? '·' : String(reflections)} label={reflections === 1 ? 'reflection' : 'reflections'} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.line }]} />
          <Stat value={String(streak)} label="day streak" colors={colors} />
        </Card>

        {finishedPlans !== null && (
          <View style={styles.treeWrap}>
            <StreakTree count={finishedPlans} />
            <Text style={[styles.treeCaption, { color: colors.muted }]}>
              {treeCaption(finishedPlans)}
            </Text>
          </View>
        )}

        <Floral variant="divider" style={styles.divider} />

        <View style={styles.footer}>
          <Button title="Pick your next plan" onPress={() => router.replace('/(onboarding)/plan-select')} />
          {!!params.planId && (
            <Button
              title="Read it again"
              variant="secondary"
              onPress={retake}
              loading={retaking}
              style={styles.footer2}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// This screen is the moment a tree is earned, so it names the one that just
// arrived rather than counting down to a ceiling.
function treeCaption(finishedPlans: number): string {
  const award = currentAward(finishedPlans);
  const next = nextAward(finishedPlans);
  const done = `${cap(word(finishedPlans))} ${finishedPlans === 1 ? 'plan' : 'plans'} finished together.`;

  // Before the first tree. This screen only ever renders after a finish, so it
  // must never tell a couple who just finished one that nothing has happened:
  // it counts what they did and names what it is heading toward.
  if (!award) {
    const togo = (next?.threshold ?? 0) - finishedPlans;
    return `${done} ${cap(word(togo))} more and a fig tree goes in the ground.`;
  }
  if (award.threshold === finishedPlans) {
    return `A new tree for your grove: the ${award.name.toLowerCase()}. ${award.line}`;
  }
  if (next) return `${done} The next tree arrives at ${next.threshold}.`;
  return `${done} A whole grove, from fig to redwood.`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  footer2: { marginTop: 10 },
  treeWrap: { alignItems: 'center', marginBottom: 12 },
  treeCaption: { fontFamily: fonts.sans, fontSize: 12, marginTop: 8, textAlign: 'center' },
});
