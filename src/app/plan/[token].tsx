import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { PamweLoading } from '../../components/ui/PamweLoading';
import { Floral } from '../../components/ui/Floral';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { getSharedPlan, enrollInPlan, SharedPlanPreview, Cadence } from '../../lib/plans';
import { haptics } from '../../lib/haptics';

/**
 * Accepting a plan another couple sent (pamwe://plan/<token>).
 *
 * Deliberately a preview with a button, never an automatic enrolment. A link
 * that silently replaced what a couple were reading, from a URL anyone could
 * forward, would be the app changing their week without asking.
 */
export default function SharedPlanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan, loading: coupleLoading, refresh: refreshCouple } = useCouple();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [plan, setPlan] = useState<SharedPlanPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) { setLoading(false); return; }
    getSharedPlan(token)
      .then((p) => { if (alive) setPlan(p); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const accept = async () => {
    if (!couple?.id || !plan || joining) return;
    setJoining(true);
    try {
      await enrollInPlan(couple.id, plan.id, 1 as Cadence);
      await refreshCouple();
      haptics.celebrate();
      router.replace('/(tabs)/today');
    } catch (e: any) {
      setJoining(false);
      Alert.alert("Couldn't start it", e?.message ?? 'Try again in a moment.');
    }
  };

  if (loading || coupleLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><PamweLoading /></View>
      </SafeAreaView>
    );
  }

  // A signed-out or unpaired visitor: the gate owns where they go next, and a
  // plan is meaningless before there are two of you.
  if (!couple?.id) {
    return (
      <Shell colors={colors}>
        <Text variant="h2" italic style={styles.title}>You'll need Pamwe first</Text>
        <Text style={[styles.body, { color: colors.ink2 }]}>
          Someone shared a reading plan with you. Sign in and pair with your partner, then open the link again.
        </Text>
        <Button title="Get started" onPress={() => router.replace('/')} style={styles.cta} />
      </Shell>
    );
  }

  if (!plan) {
    return (
      <Shell colors={colors}>
        <Text variant="h2" italic style={styles.title}>That link has expired</Text>
        <Text style={[styles.body, { color: colors.ink2 }]}>
          Ask them to share it again, or find something together in Plans.
        </Text>
        <Button title="Browse plans" onPress={() => router.replace('/(tabs)/plans')} style={styles.cta} />
      </Shell>
    );
  }

  return (
    <Shell colors={colors}>
      <Text variant="eyebrow" color={colors.accent2}>Shared with you</Text>
      <Text variant="h1" style={styles.title}>{plan.title}</Text>
      {!!plan.tagline && <Text style={[styles.tagline, { color: colors.ink2 }]}>{plan.tagline}</Text>}

      <Floral variant="divider" style={styles.divider} />

      <Text style={[styles.body, { color: colors.ink2 }]}>
        {plan.duration_days} days, read together.
        {plan.couples > 1 ? ` ${plan.couples} couples have walked it.` : ''}
      </Text>

      {couplePlan && (
        <Text style={[styles.warn, { color: colors.muted }]}>
          Starting this sets aside {couplePlan.plan?.title ?? 'the plan you are reading'}. Everything you have
          written stays in your reflections.
        </Text>
      )}

      <Button title="Start it together" onPress={accept} loading={joining} style={styles.cta} />
      <Button title="Not now" variant="secondary" onPress={() => router.replace('/(tabs)/plans')} style={styles.cta2} />
    </Shell>
  );
}

function Shell({ colors, children }: { colors: any; children: React.ReactNode }) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER },
  title: { marginTop: 10, textAlign: 'left' },
  tagline: { fontFamily: fonts.serifItalic, fontSize: 15, marginTop: 8 },
  divider: { width: 140, height: 26, marginVertical: 18, opacity: 0.85 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23 },
  warn: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, marginTop: 14 },
  cta: { marginTop: 26 },
  cta2: { marginTop: 10 },
});
