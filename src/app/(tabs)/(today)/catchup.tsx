import { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Floral } from '../../../components/ui/Floral';
import { BackInStep } from '../../../components/BackInStep';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getPlanDayList } from '../../../lib/plans';
import { getMySealedDays } from '../../../lib/entries';
import { owedDays, myOwedDays, todayInTimezone } from '../../../lib/catchup';
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
  const { couple, couplePlan, partner } = useCouple();
  const partnerName = partner?.display_name ?? 'your partner';

  const [rows, setRows] = useState<any[] | null>(null);
  const [sealed, setSealed] = useState<Set<number>>(new Set());
  // What I had already written when this screen opened. Everything sealed past
  // it is work done in this sitting, which is the only thing the ceremony
  // celebrates: a partner's Amen shrinking the list is not something I did.
  const baseSealed = useRef<Set<number> | null>(null);
  const [caught, setCaught] = useState<number[] | null>(null);
  const played = useRef(false);

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
          .then((s) => {
            if (!alive) return;
            setSealed(s);

            // The run, judged on the fresh set rather than on state that has
            // not landed yet. The first settle only takes the baseline: you
            // cannot have caught up in a sitting you just started.
            if (baseSealed.current === null) { baseSealed.current = s; return; }
            if (played.current || myOwedDays(days, s).length > 0) return;
            const cleared = [...s].filter((d) => !baseSealed.current!.has(d)).sort((a, b) => a - b);
            if (cleared.length >= 2) { played.current = true; setCaught(cleared); }
          })
          // A failed status lookup costs the "you've written yours" line, not
          // the list: the days themselves are what someone came here for.
          .catch(() => {});
      }
      return () => { alive = false; };
      // `days` is memoized on the values that produce it, so its identity is
      // stable between renders and this does not refetch on every focus tick.
    }, [planId, couplePlanId, days]),
  );

  // Plan context is what puts the Reflect button in the reader, and every day I
  // still owe gets it. It used to go only to current_day, which made this
  // screen a list of four days you could open and one you could write: the
  // pointer moves on Amen, Amen needs BOTH partners sealed, so a person
  // catching up alone wrote one reflection and stopped. If their partner was
  // behind too, nobody moved.
  //
  // Writing is solo and the reveal is shared, so they come apart here. Each day
  // I seal stays sealed until my partner writes theirs, exactly as it always
  // has: the locked reveal is keyed per (couple_plan_id, day_number), so day 4
  // reveals on its own without waiting for day 2.
  //
  // A day I have already written gets no context, so the reader offers no
  // second reflection on it. The gate still refuses anything past today:
  // canOpenDay is directional and owedDays never runs past expectedDay.
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
        ...(couplePlanId && !sealed.has(day)
          ? { couplePlanId, day: String(day), planTitle }
          : {}),
      },
    }, { withAnchor: true });
  };

  const missed = Math.max(0, days.length - 1);
  // "Start here" follows what I still owe, not the couple's pointer. Catching
  // up alone leaves current_day where it was, and pinning the highlight to it
  // would keep pointing at a day I had already written.
  const mine = myOwedDays(days, sealed);
  const startHere = mine.length > 0 ? mine[0] : null;

  return (
    <>
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
              const isNext = day === startHere;
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

        {mine.length > 1 && (
          <Text style={[styles.footnote, { color: colors.muted }]}>
            Take them all in one sitting if you want to. Each one stays sealed
            until {partnerName} has written theirs.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>

    {/* A sibling of the SafeAreaView, not a child: an absolute fill inside the
        safe area leaves the status bar showing the list underneath, and the
        planting learned the same lesson on the completion screen.

        It navigates away without clearing `caught` first, because dropping the
        overlay would show the emptied list for a frame on the way out. */}
    {caught !== null && (
      <BackInStep days={caught} onDone={() => router.replace('/(tabs)/(today)')} />
    )}
    </>
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
