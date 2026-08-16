import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { StripedBanner } from '../../components/ui/StripedBanner';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { GUTTER } from '../../theme/tokens';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { getCuratedPlans, enrollInPlan, switchPlan, CADENCE_OPTIONS, type Cadence } from '../../lib/plans';
import { lastFinishedPlan } from '../../lib/planHistory';
import { bannerTintForPlan } from '../../lib/planArtwork';
import { getUserCouple } from '../../lib/couples';
import { haptics } from '../../lib/haptics';

export default function PlanSelectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, refresh } = useCouple();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSwitch = mode === 'change';
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>(1);

  // Start from the rhythm they last finished on. A couple who read every other
  // day for a whole plan has already answered this question, and defaulting
  // back to daily quietly signs them up for twice the pace.
  useEffect(() => {
    if (!couple?.id) return;
    lastFinishedPlan(couple.id)
      .then((p) => { if (p) setCadence((p.cadenceDays as Cadence) ?? 1); })
      .catch(() => {});
  }, [couple?.id]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      const data = await getCuratedPlans();
      setPlans(data);
      // Initial enroll: preselect the first (shortest) plan. Switch mode: force a pick.
      if (!isSwitch && data.length > 0) setSelectedId(data[0].id);
    } catch {
      // Empty state handles the failure.
    } finally {
      setLoading(false);
    }
  };

  const doEnroll = async () => {
    if (!selectedId) return;
    try {
      setEnrolling(true);
      const couple = await getUserCouple();
      if (!couple) throw new Error("We couldn't find your couple. Check your connection and try again.");
      if (isSwitch) {
        await switchPlan(couple.id, selectedId, cadence);
      } else {
        await enrollInPlan(couple.id, selectedId, cadence);
      }
      // The tabs read couple/plan from CoupleProvider — bring it up to date
      // before entering, or every tab sees a stale null plan.
      await refresh();
      haptics.success();
      router.replace('/(tabs)/(today)');
    } catch (err: any) {
      setEnrolling(false);
      Alert.alert("Couldn't set your plan", err?.message ?? "That didn't go through. Give it another try in a moment.");
    }
  };

  const handleEnroll = () => {
    if (!selectedId) return;
    if (!isSwitch) { doEnroll(); return; }
    Alert.alert(
      'Switch reading plan?',
      'Your current plan will be marked complete. The new one starts at day 1, for both of you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', style: 'destructive', onPress: doEnroll },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text variant="h1">{isSwitch ? 'Switch plan' : 'Choose your plan'}</Text>
        <Text variant="body" color={colors.ink2} style={styles.subtitle}>
          {isSwitch
            ? 'Pick a new reading plan. Your current one will be marked complete and the new plan starts at day 1.'
            : 'Move through Scripture with your partner and grow in faith.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {plans.length === 0 && (
          <View style={styles.empty}>
            <Text variant="body" color={colors.ink2} style={styles.emptyText}>
              Houston, we have a problem. Check your connection and try again.
            </Text>
            <Button title="Try again" variant="secondary" onPress={() => { setLoading(true); loadPlans(); }} />
          </View>
        )}
        {plans.map((plan) => {
          const selected = selectedId === plan.id;
          return (
            <TouchableOpacity key={plan.id} activeOpacity={0.85} onPress={() => { haptics.tap(); setSelectedId(plan.id); }}
              accessibilityRole="button" accessibilityLabel={plan.title} accessibilityState={{ selected }}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.line, borderWidth: selected ? 2 : 1 },
              ]}
            >
              <StripedBanner height={72} stripe={6} tint={bannerTintForPlan(plan)}>
                <View style={styles.cardBannerLabel}>
                  <Text variant="scripture" italic color={colors.accent}>{plan.title}</Text>
                </View>
              </StripedBanner>
              <View style={styles.cardBody}>
                {plan.tagline ? (
                  <Text variant="eyebrow" color={colors.accent2} style={styles.cardTagline}>{plan.tagline}</Text>
                ) : null}
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  {(plan.book_label ?? plan.title)} · {plan.duration_days} days · {plan.minutes_label ?? '~10 min'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {/* Beta feedback: every day is more than most couples can hold. The
            rhythm is set with the plan, since a dated plan like M'Cheyne wants
            daily while a short plan can suit a slower pace. */}
        {selectedId && (
          <View style={styles.cadence}>
            <Text variant="eyebrow" color={colors.accent2}>How often?</Text>
            <SegmentedControl
              segments={CADENCE_OPTIONS.map((o) => ({ key: String(o.value), label: o.label }))}
              value={String(cadence)}
              onChange={(k) => setCadence(Number(k) as Cadence)}
              style={styles.cadenceControl}
            />
            <Text style={[styles.cadenceBlurb, { color: colors.muted }]}>
              {CADENCE_OPTIONS.find((o) => o.value === cadence)?.blurb}
            </Text>
          </View>
        )}
        <Button
          title={isSwitch ? 'Switch to this plan' : "Let's get the ball rolling"}
          onPress={handleEnroll}
          loading={enrolling}
          disabled={!selectedId || enrolling}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: GUTTER, paddingTop: 24 },
  subtitle: { marginTop: 10, lineHeight: 21 },
  list: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 12, gap: 14 },
  empty: { alignItems: 'center', gap: 18, marginTop: 24 },
  emptyText: { textAlign: 'center', lineHeight: 21 },
  card: { borderRadius: 18, overflow: 'hidden' },
  cardBannerLabel: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  cardBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  cardTagline: { letterSpacing: 2 },
  cardMeta: { fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 16 },
  cadence: { marginBottom: 16 },
  cadenceControl: { marginTop: 10 },
  cadenceBlurb: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
