import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getPlanDayList } from '../../../lib/plans';
import { getMySealedDays } from '../../../lib/entries';
import { owedDays, todayInTimezone } from '../../../lib/catchup';
import { parseReference } from '../../../lib/bible';
import { haptics } from '../../../lib/haptics';

// Falling behind used to be a dead end. Today shows current_day and nothing
// else, so a couple four days back saw one reading, a banner that told them
// reading it would put them "back in step" (it would not), and no way at all to
// see what they had missed. The days were open the whole time (the cadence gate
// is directional), just unreachable without going to Plans and scrolling the
// schedule. This is the door.
export default function CatchUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan } = useCouple();

  const [rows, setRows] = useState<any[] | null>(null);
  const [sealed, setSealed] = useState<Set<number>>(new Set());

  const currentDay = couplePlan?.current_day ?? 1;
  const totalDays = couplePlan?.plan?.duration_days ?? 365;
  const cadence = couplePlan?.cadence_days ?? 1;
  const planTitle = couplePlan?.plan?.title ?? 'Your plan';
  const todayISO = todayInTimezone(couple?.timezone ?? 'UTC');

  const days = useMemo(
    () => owedDays(currentDay, couplePlan?.start_date, todayISO, totalDays, cadence),
    [currentDay, couplePlan?.start_date, todayISO, totalDays, cadence],
  );

  const planId = couplePlan?.plan?.id ?? couplePlan?.plan_id ?? null;
  const couplePlanId = couplePlan?.id ?? null;

  // Refetched on focus so working through a day and coming back drops it off
  // the list, which is the whole feeling this screen is meant to give.
  useFocusEffect(
    useCallback(() => {
      if (!planId || days.length === 0) { setRows([]); return; }
      let alive = true;
      getPlanDayList(planId, days[0], days.length)
        .then((d) => { if (alive) setRows(d); })
        .catch(() => { if (alive) setRows([]); });
      if (couplePlanId) {
        getMySealedDays(couplePlanId, days)
          .then((s) => { if (alive) setSealed(s); })
          // A failed status lookup costs the "you've written yours" line, not
          // the list: the days themselves are what someone came here for.
          .catch(() => {});
      }
      return () => { alive = false; };
      // `days` is memoized on the values that produce it, so its identity is
      // stable between renders and this does not refetch on every focus tick.
    }, [planId, couplePlanId, days]),
  );

  // Plan context is what puts the Reflect button in the reader, and only the
  // day the ritual is actually on gets it. current_day advances one day at a
  // time on Amen, so a reflection written three days ahead of it would sit
  // there sealed while Today kept offering the day before it. Scripture is
  // never locked, so the days after this one still open to read.
  const open = (day: number, ref: string | null | undefined) => {
    haptics.tap();
    const parsed = parseReference(ref ?? '');
    if (!parsed) {
      router.push({ pathname: '/(tabs)/(today)/reading', params: { day: String(day) } });
      return;
    }
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: {
        book: parsed.book.name,
        chapter: String(parsed.chapter ?? 1),
        ...(parsed.verse ? { verse: String(parsed.verse) } : {}),
        ...(parsed.endVerse ? { to: String(parsed.endVerse) } : {}),
        ...(day === currentDay && couplePlanId
          ? { couplePlanId, day: String(day), planTitle }
          : {}),
      },
    }, { withAnchor: true });
  };

  const missed = Math.max(0, days.length - 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="Today" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Catch up</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          {missed === 0
            ? 'You are on pace. Today is the only one open.'
            : missed === 1
            ? 'One day slipped by. Take it whenever you two can sit down.'
            : `${missed} days slipped by. Take them at your own pace, together.`}
        </Text>

        {rows === null ? (
          <View style={styles.center}><PamweLoading /></View>
        ) : days.length === 0 ? (
          <View style={styles.empty}>
            <Floral variant="divider" style={styles.emptyFloral} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nothing to catch up on. You are exactly where you meant to be.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {days.map((day) => {
              const row = rows.find((r: any) => r.day_number === day);
              const isNext = day === currentDay;
              const isToday = day === days[days.length - 1] && missed > 0;
              return (
                <TouchableOpacity
                  key={day}
                  activeOpacity={0.85}
                  onPress={() => open(day, row?.passage_reference)}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}, ${row?.passage_reference ?? 'reading'}`}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isNext ? colors.surface2 : colors.surface,
                      borderColor: isNext ? colors.lineAccent : colors.line,
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <View style={styles.tagRow}>
                      <Text variant="eyebrow" color={isNext ? colors.accent2 : colors.muted}>
                        Day {day}
                      </Text>
                      {isNext && <Text variant="eyebrow" color={colors.accent}>Start here</Text>}
                      {!isNext && isToday && <Text variant="eyebrow" color={colors.muted}>Today</Text>}
                    </View>
                    {/* The spinner covers the real load, so a missing row here
                        means the schedule fetch failed. The day still opens:
                        without a reference to parse, the reading screen loads
                        it by day number. */}
                    <Text style={[styles.rowRef, { color: colors.ink }]}>
                      {row?.passage_reference ?? 'Open the reading'}
                    </Text>
                    {sealed.has(day) && (
                      <Text style={[styles.rowNote, { color: colors.muted }]}>
                        You have written yours.
                      </Text>
                    )}
                  </View>
                  <CaretRight size={15} color={isNext ? colors.accent2 : colors.muted} weight="regular" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {days.length > 1 && (
          <Text style={[styles.footnote, { color: colors.muted }]}>
            One at a time. Finishing the day you start here opens the next one.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { marginTop: 34, alignItems: 'center' },
  emptyFloral: { width: 150, height: 26, opacity: 0.85, marginBottom: 16 },
  emptyText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  list: { marginTop: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRef: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, marginTop: 5 },
  rowNote: { fontFamily: fonts.sans, fontSize: 11, marginTop: 5 },
  footnote: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 },
});
