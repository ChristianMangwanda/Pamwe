import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, CaretRight } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { retiredPlans, type RetiredPlan } from '../../../lib/planHistory';
import { haptics } from '../../../lib/haptics';

// The Plans tab used to collapse this to one line whose tap opened the newest
// finished plan and nothing else, so plans two and older had no way back.
//
// It now holds plans ended part way as well. Those were invisible everywhere:
// isFinished() is false for them, so they fell out of every list in the app
// while their status said 'completed'. The days a couple actually read are the
// point, and the meta line says exactly how many.
export default function FinishedPlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [plans, setPlans] = useState<RetiredPlan[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (!couple?.id) { setPlans([]); return; }
    retiredPlans(couple.id)
      // A plan ended before a single day was read together is an abandoned
      // enrolment, not history. Switching plans creates those.
      .then((rows) => { if (alive) setPlans(rows.filter((p) => p.finished || p.daysRead > 0)); })
      .catch(() => { if (alive) setPlans([]); });
    return () => { alive = false; };
  }, [couple?.id]);

  const open = (planId: string) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/plans/[id]', params: { id: planId } });
  };

  return (
    <Screen>
      <BackLink label="Plans" onPress={() => router.back()} />
      <Text variant="h1" style={styles.title}>Plans you've read</Text>
      <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
        Every plan you opened together, finished or ended.
      </Text>

      {plans === null ? (
        <View style={styles.center}><PamweLoading /></View>
      ) : plans.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>
          The first plan you read together shows up here.
        </Text>
      ) : (
        <View style={styles.list}>
          {plans.map((p) => (
            <TouchableOpacity key={p.couplePlanId} activeOpacity={0.85} onPress={() => open(p.planId)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                <CheckCircle size={19} color={colors.accent2} weight={p.finished ? 'fill' : 'regular'} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={2}>{p.title}</Text>
                <Text style={[styles.rowMeta, { color: colors.muted }]}>{metaFor(p)}</Text>
              </View>
              <CaretRight size={15} color={colors.accent2} weight="regular" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Screen>
  );
}

function metaFor(p: RetiredPlan): string {
  // A finished plan is described by its length; an ended one by how far you
  // actually got, which is the whole reason it is listed.
  const days = p.finished
    ? `${p.durationDays} days`
    : `Read ${p.daysRead} of ${p.durationDays} days`;
  if (!p.finishedOn) return days;
  const d = new Date(p.finishedOn);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const when = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${days} · ${p.finished ? 'finished' : 'ended'} ${when}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, marginTop: 26 },
  list: { marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.serif, fontSize: 15 },
  rowMeta: { fontFamily: fonts.sans, fontSize: 11.5, marginTop: 2 },
});
