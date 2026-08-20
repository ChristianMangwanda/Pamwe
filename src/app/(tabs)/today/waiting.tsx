import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { popIn } from '../../../lib/motion';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useCouple } from '../../../providers/CoupleProvider';
import { supabase } from '../../../lib/supabase';
import { profileInitial } from '../../../lib/couples';
import { getMySealedDays } from '../../../lib/entries';
import { owedDays, myOwedDays, todayInTimezone } from '../../../lib/catchup';
import { haptics } from '../../../lib/haptics';

const FALLBACK_POLL_MS = 30000;

export default function WaitingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, partner } = useCouple();
  // Pinned: if the partner submits and amens while this screen is open, an
  // unpinned wait would follow current_day onto the next day and sit there
  // waiting forever on a day neither partner has read. The plan is pinned for
  // the same reason: on the final day the partner's submit retires it, and this
  // screen used to lose the plan, the partner entry with it, and wait forever
  // on a day that was already finished.
  const { day } = useLocalSearchParams<{ day?: string }>();
  const { partnerEntry, dayNumber, refresh, error, couplePlan } = useTodayEntry(day ? Number(day) : undefined, true);
  const partnerName = partner?.display_name ?? 'Your partner';
  const partnerInitial = profileInitial(partner) ?? '?';

  useEffect(() => {
    if (!couplePlan) return;
    const channel = supabase
      .channel(`partner-entry-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `couple_plan_id=eq.${couplePlan.id}` }, () => { refresh(); })
      .subscribe();
    const fallback = setInterval(refresh, FALLBACK_POLL_MS);
    return () => { supabase.removeChannel(channel); clearInterval(fallback); };
  }, [couplePlan?.id, refresh]);

  // Mid-catch-up this screen used to be a wall. current_day only moves on Amen
  // and Amen needs both partners, so someone clearing a backlog alone sealed one
  // day and had nowhere to go but back to Today, with three days still owed and
  // nothing offering them. The wait below is still true; it is just no longer
  // the only thing on the screen.
  const [stillOwed, setStillOwed] = useState<number[] | null>(null);
  useEffect(() => {
    if (!couplePlan) return;
    const owed = owedDays(
      couplePlan.current_day ?? 1,
      couplePlan.start_date,
      todayInTimezone(couple?.timezone ?? 'UTC'),
      couplePlan.plan?.duration_days ?? 365,
      couplePlan.cadence_days ?? 1,
    );
    if (owed.length === 0) { setStillOwed([]); return; }
    let alive = true;
    getMySealedDays(couplePlan.id, owed)
      .then((s) => { if (alive) setStillOwed(myOwedDays(owed, s)); })
      // Losing this costs the shortcut, not the wait, which is the screen.
      .catch(() => { if (alive) setStillOwed([]); });
    return () => { alive = false; };
  }, [couplePlan?.id, couplePlan?.current_day, couple?.timezone]);

  const owedLeft = stillOwed?.length ?? 0;

  // Once. A second replace remounts the reveal on top of the one already
  // playing, and the ceremony there is worth exactly one arrival.
  const handedOver = useRef(false);
  useEffect(() => {
    if (partnerEntry?.submitted_at && !handedOver.current) {
      handedOver.current = true;
      router.replace({ pathname: '/(tabs)/today/reveal', params: { day: String(dayNumber) } });
    }
  }, [partnerEntry?.submitted_at, dayNumber]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View entering={popIn} style={[styles.check, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
          <Check size={32} color={colors.accent} weight="bold" />
        </Animated.View>
        <Text style={[styles.title, { color: colors.ink }]}>Yours is in.</Text>
        <Text color={colors.ink2} style={styles.body}>
          It stays sealed until {partnerName} has written too. The moment you both have, we'll tell you. Some things are worth the wait.
        </Text>

        <View style={[styles.partnerCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.avatar, { borderColor: colors.accent2 }]}>
            <Text style={[styles.avatarInitial, { color: colors.accent }]}>{partnerInitial}</Text>
          </View>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}>{partnerName} is reading…</Text>
        </View>

        {error && (
          <Text color={colors.muted} style={styles.errorHint}>Houston, we have a problem. We can't reach the server right now.</Text>
        )}
      </View>

      <View style={styles.footer}>
        {owedLeft > 0 && (
          <Button
            title={owedLeft === 1 ? 'Keep going: 1 day left' : `Keep going: ${owedLeft} days left`}
            onPress={() => {
              haptics.tap();
              // POP_TO: back to the catch-up list if it is already below us,
              // which keeps that screen's run counter alive so clearing the
              // last day still lands the moment. Pushed fresh otherwise.
              router.dismissTo('/(tabs)/today/catchup');
            }}
          />
        )}
        <Button
          title="Back to Today"
          variant={owedLeft > 0 ? 'ghost' : 'primary'}
          onPress={() => router.replace('/(tabs)/today')}
          style={owedLeft > 0 ? styles.secondary : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  check: { width: 74, height: 74, borderRadius: 37, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serifLight, fontSize: 28, lineHeight: 32, marginTop: 22, textAlign: 'center' },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  partnerCard: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 16 },
  errorHint: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center', marginTop: 20 },
  footer: { paddingBottom: 12 },
  secondary: { marginTop: 4 },
});
