import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { StripedBanner } from '../../components/ui/StripedBanner';
import { GUTTER } from '../../theme/tokens';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { getCuratedPlans, enrollInPlan, switchPlan } from '../../lib/plans';
import { bannerTintForPlan } from '../../lib/planArtwork';
import { getUserCouple } from '../../lib/couples';
import { haptics } from '../../lib/haptics';

export default function PlanSelectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refresh } = useCouple();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSwitch = mode === 'change';
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      if (!couple) throw new Error('No couple found');
      if (isSwitch) {
        await switchPlan(couple.id, selectedId);
      } else {
        await enrollInPlan(couple.id, selectedId);
      }
      // The tabs read couple/plan from CoupleProvider — bring it up to date
      // before entering, or every tab sees a stale null plan.
      await refresh();
      haptics.success();
      router.replace('/(tabs)/(today)');
    } catch (err: any) {
      setEnrolling(false);
      Alert.alert('Could not change plan', err?.message ?? 'Please try again.');
    }
  };

  const handleEnroll = () => {
    if (!selectedId) return;
    if (!isSwitch) { doEnroll(); return; }
    Alert.alert(
      'Switch reading plan?',
      'Your current plan will be marked complete and the new one will start at day 1. This affects you and your partner.',
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
            : 'You and your partner will read through Scripture together, one day at a time.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {plans.length === 0 && (
          <View style={styles.empty}>
            <Text variant="body" color={colors.ink2} style={styles.emptyText}>
              We couldn't load the reading plans. Check your connection and try again.
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
        <Button
          title={isSwitch ? 'Switch to this plan' : 'Begin together'}
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
});
