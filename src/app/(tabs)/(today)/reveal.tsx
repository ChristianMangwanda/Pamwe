import { useEffect, useRef, useState, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { HandsPraying } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Button } from '../../../components/ui/Button';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { Floral } from '../../../components/ui/Floral';
import { AudioPlayer } from '../../../components/AudioPlayer';
import { ReflectionResponses } from '../../../components/ReflectionResponses';
import { RevealCeremony } from '../../../components/RevealCeremony';
import { unseal, UnsealKind } from '../../../lib/motion';
import { haptics } from '../../../lib/haptics';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useCouple } from '../../../providers/CoupleProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { profileInitial } from '../../../lib/couples';
import { advancePlanDay } from '../../../lib/plans';
import { supabase } from '../../../lib/supabase';
import { getResponsesForDay, EntryResponse } from '../../../lib/entryResponses';
import { markRevealSeen } from '../../../lib/entries';

export default function RevealScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  // Pin to the day we opened, so the other partner tapping Amen (which advances
  // the couple's current_day and arrives here over realtime) can't pull this
  // screen onto the next, empty day while it's still being read.
  const { day } = useLocalSearchParams<{ day?: string }>();
  const pinnedDay = day ? Number(day) : undefined;
  // The plan is pinned too. On the final day the mutual submit retires it, and
  // an unpinned reveal lost the plan out from under itself the moment realtime
  // delivered that, showing "That plan is finished" in place of the reflections.
  const { myEntry, partnerEntry, dayNumber, planDay, loading, error, refresh, couplePlan } = useTodayEntry(pinnedDay, true);
  const { partner, me, loading: coupleLoading, refresh: refreshCouple } = useCouple();

  // My own initial comes from my profile, the same place the partner's does.
  const myInitial = me?.avatar_initial
    ?? (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase()
    ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? 'P';
  const partnerName = partner?.display_name ?? 'Your partner';
  const totalDays = couplePlan?.plan?.duration_days;
  const isFinalDay = !!totalDays && dayNumber >= totalDays;

  const revealed = !!myEntry && !!partnerEntry;

  // The ceremony plays the FIRST time this day's reveal is opened. Coming back
  // to reread goes straight to the words: a moment you have to sit through
  // twice stops being a moment and becomes a toll gate.
  //
  // 'checking' renders an opaque cover, so the cards can never flash behind the
  // ceremony while the entry is still loading.
  const [phase, setPhase] = useState<'checking' | 'playing' | 'done'>('checking');
  // How the cards arrive, and whether they are on the tree at all. The ceremony
  // sets this when it starts its lift, 140ms before the veil has cleared, so
  // they unfurl underneath it as its closing beat rather than after it.
  const [cardMotion, setCardMotion] = useState<UnsealKind | null>(null);

  // Nothing here plays the ceremony, so this is the one place left to mark the
  // moment: its own score ends in deliberate silence and a skip fires none.
  const straightToWords = () => {
    setPhase('done');
    setCardMotion('full');
    haptics.success();
  };

  // Marked seen when the ceremony ENDS, never when it starts. Writing it up
  // front burned the moment on any interruption inside those 4.3 seconds: a
  // screen that remounts (the waiting screen's replace and a tapped partner
  // push both navigate here) read a flag set by a ceremony nobody had watched
  // and went straight to the cards. A skip counts as played: the skip path runs
  // the same close, so it lands here too.
  //
  // This lives in the database now (entries.reveal_seen_at), not in this
  // phone's AsyncStorage. The flag decides whether Today offers the reveal
  // back, and the partner who did not tap Amen is exactly the one who needs
  // that offer, possibly on another device or after a reinstall.
  const markSeen = () => {
    if (!couplePlan?.id) return;
    markRevealSeen(couplePlan.id, dayNumber).catch(() => {});
  };

  useEffect(() => {
    // Decided once, on arrival. Marking seen refetches the entry, and without
    // the phase guard that would run this again and fire a second haptic.
    if (!revealed || phase !== 'checking') return;
    if (myEntry.reveal_seen_at) straightToWords();
    else setPhase('playing');
  }, [revealed, phase, myEntry?.reveal_seen_at]);

  // Responses layer: what each of us left on the other's reflection. Live:
  // realtime on entry_responses refetches, and `revision` tells the cards to
  // re-sync to server truth.
  const [responsesByEntry, setResponsesByEntry] = useState<Record<string, EntryResponse[]>>({});
  const [responsesRev, setResponsesRev] = useState(0);
  useEffect(() => {
    if (!revealed || !couplePlan?.id) return;
    const load = () => {
      getResponsesForDay(couplePlan.id, dayNumber)
        .then((r) => { setResponsesByEntry(r); setResponsesRev((n) => n + 1); })
        .catch(() => {});
    };
    load();
    const channel = supabase
      .channel(`responses-${couplePlan.id}-${dayNumber}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_responses', filter: `couple_plan_id=eq.${couplePlan.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [revealed, couplePlan?.id, dayNumber]);

  // A reveal opened before both have written is NOT a failure, and must never
  // be dressed as one. It happens for real: the partner push carried no day, so
  // a tap that landed after they had amened opened the NEXT day, where nobody
  // has written yet, and the screen blamed the connection for it.
  //
  // Each case has a screen that is already right for it, so hand off rather
  // than inventing a third state here.
  useEffect(() => {
    if (loading || coupleLoading || !couplePlan || error || revealed) return;
    if (!myEntry) {
      // Nothing written yet, so this day is not a reveal at all. Today derives
      // the right next step from server state.
      router.replace('/(tabs)/(today)');
    } else {
      // You have written and they have not. That is the waiting screen, and it
      // carries you back here by itself the moment they submit.
      router.replace({ pathname: '/(tabs)/(today)/waiting', params: { day: String(dayNumber) } });
    }
  }, [loading, coupleLoading, couplePlan, error, revealed, myEntry, dayNumber]);

  // The tap is guarded by a ref, not by the state below: state is for the
  // button's look, and a second tap can land before React has re-rendered with
  // it. advancePlanDay is already idempotent (it guards on current_day), but
  // two taps also fired two navigations.
  const [amening, setAmening] = useState(false);
  const amenInFlight = useRef(false);

  const onAmen = async () => {
    if (amenInFlight.current) return;
    amenInFlight.current = true;
    setAmening(true);
    haptics.tap();
    // Capture the plan before refresh: completing the final day retires it,
    // and the celebration screen needs to know what was finished.
    const completed = isFinalDay && couplePlan
      ? {
          title: couplePlan.plan?.title ?? '',
          days: String(totalDays ?? ''),
          cpId: couplePlan.id,
          // Carried so "Read it again" can re-enrol at the same rhythm without
          // asking, and without another round trip on the celebration screen.
          planId: couplePlan.plan?.id ?? couplePlan.plan_id ?? '',
          cadence: String(couplePlan.cadence_days ?? 1),
        }
      : null;
    // Move to the next day here, once the reveal has actually been read. The DB
    // used to do it the instant both partners submitted, which pulled every
    // ritual screen onto the next empty day and ate the reveal. The final day
    // has no next day: the submit trigger retires the plan instead.
    //
    // That trigger is paused on hosted (20260807000003) so a phone on build 23
    // could finish its plan; until 20260808000007 is applied, a plan's last day
    // completes only by enrolling in the next one or by the manual button on the
    // plan screen.
    if (!completed && couplePlan) {
      try {
        await advancePlanDay(couplePlan.id, dayNumber);
      } catch (err) {
        // This used to be swallowed into Sentry and then navigate anyway, so a
        // failed advance dropped you back on Today with the day unchanged and
        // nothing said. Worse, the ceremony was already marked seen, so
        // reopening went straight to the words. Staying here IS recoverable,
        // but only if you know to try again.
        Sentry.captureException(err);
        amenInFlight.current = false;
        setAmening(false);
        Alert.alert(
          "Couldn't mark the day complete",
          'Your reflections are safe. Check your connection and try again.',
          [
            { text: 'Back to Today', style: 'cancel', onPress: () => router.replace('/(tabs)/(today)') },
            { text: 'Try again', onPress: () => { onAmen(); } },
          ],
        );
        return;
      }
    }
    await refreshCouple();
    if (completed) router.replace({ pathname: '/(tabs)/(today)/complete', params: completed });
    else router.replace('/(tabs)/(today)');
  };

  if ((loading || coupleLoading) && !revealed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}><PamweLoading /></View>
      </SafeAreaView>
    );
  }

  // No active plan, so the plan this reveal belongs to is finished and there is
  // nothing here to load. This used to fall through to "Couldn't load your
  // reflections. Check your connection", which blamed the network for a
  // finished plan and read as though the reflections were gone. They are not:
  // the history keys off the couple, not the active plan.
  if (!couplePlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text variant="h2" style={styles.errorTitle}>That plan is finished</Text>
          <Text color={colors.ink2} style={styles.errorText}>
            Every day you read together is still in your reflections. Start a new plan whenever you're both ready.
          </Text>
          <View style={styles.errorActions}>
            <Button title="Read your reflections" onPress={() => router.replace('/(tabs)/reflect')} />
            <Button title="Pick your next plan" variant="secondary" onPress={() => router.replace('/(onboarding)/plan-select')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // This copy is now reserved for what it actually describes: the fetch failed.
  // It used to catch every not-yet-revealed day as well, so a perfectly healthy
  // phone was told to check its connection.
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}>
          <Text variant="h2" style={styles.errorTitle}>Couldn't load your reflections</Text>
          <Text color={colors.ink2} style={styles.errorText}>Check your connection and try again.</Text>
          <View style={styles.errorActions}>
            <Button title="Try again" onPress={refresh} />
            <Button title="Back to Today" variant="secondary" onPress={() => router.replace('/(tabs)/(today)')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Not revealed and not broken: the effect above is handing off, so hold the
  // spinner rather than flashing a state that is about to be replaced.
  if (!revealed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}><PamweLoading /></View>
      </SafeAreaView>
    );
  }

  return (
    // The ceremony sits outside the safe area on purpose: its veil covers the
    // whole screen and it centres on the true middle of it, not on the middle
    // of what is left after the insets.
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Replying to your partner happens on this screen, and the keyboard used
          to sit right over the box you were typing in. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <SectionEyebrow color={colors.accent2}>Revealed together</SectionEyebrow>
          <Text style={[styles.title, { color: colors.ink }]}>What you each wrote</Text>
          <Text style={[styles.ref, { color: colors.muted }]}>{planDay?.passage_reference}</Text>
          <Floral variant="divider" style={styles.divider} />
        </View>

        {/* Held back until the ceremony calls for them, so the cards unfurl as
            its closing beat rather than animating in unseen behind it. */}
        {cardMotion && (
          <>
        <Animated.View entering={unseal(0, cardMotion)}>
          <EntryCard
            initial={myInitial}
            solid={false}
            label={myEntry.entry_type === 'voice' ? 'You recorded' : 'You wrote'}
            entry={myEntry}
            accent="primary"
          >
            {couplePlan?.id && (
              <ReflectionResponses
                entry={myEntry}
                couplePlanId={couplePlan.id}
                dayNumber={dayNumber}
                canRespond={false}
                partnerName={partnerName}
                myUserId={user?.id}
                initial={responsesByEntry[myEntry.id] ?? []}
                revision={responsesRev}
              />
            )}
          </EntryCard>
        </Animated.View>

        <Animated.View entering={unseal(1, cardMotion)}>
          <EntryCard
            initial={partnerInitial}
            solid
            label={partnerEntry.entry_type === 'voice' ? `${partnerName} recorded` : `${partnerName} wrote`}
            entry={partnerEntry}
            accent="partner"
          >
            {couplePlan?.id && (
              <ReflectionResponses
                entry={partnerEntry}
                couplePlanId={couplePlan.id}
                dayNumber={dayNumber}
                canRespond
                partnerName={partnerName}
                myUserId={user?.id}
                initial={responsesByEntry[partnerEntry.id] ?? []}
                revision={responsesRev}
                entryText={partnerEntry.entry_type === 'text' ? partnerEntry.text_content : partnerEntry.transcript}
              />
            )}
          </EntryCard>
        </Animated.View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onAmen}
          disabled={amening}
          activeOpacity={0.85}
          style={[styles.amenBtn, { backgroundColor: colors.accent }, amening && styles.amenBtnBusy]}
          accessibilityRole="button"
          accessibilityLabel="Amen, mark day complete"
          accessibilityState={{ disabled: amening, busy: amening }}
        >
          <HandsPraying size={16} color={colors.bg} weight="fill" />
          <Text style={[styles.amenLabel, { color: colors.bg }]}>
            {amening ? 'Marking the day' : 'Amen · mark day complete'}
          </Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

      {phase === 'playing' && (
        <RevealCeremony
          myInitial={myInitial}
          partnerInitial={partnerInitial}
          onCardsIn={setCardMotion}
          onDone={() => { setPhase('done'); markSeen(); }}
        />
      )}
      {phase === 'checking' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}
    </View>
  );
}

function EntryCard({ initial, solid, label, entry, accent, children }: {
  initial: string; solid: boolean; label: string; entry: any; accent: 'primary' | 'partner';
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.cardHead}>
        <View style={[styles.badge, solid ? { backgroundColor: colors.accent2 } : { borderWidth: 1.5, borderColor: colors.accent2 }]}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: solid ? colors.surface : colors.accent }}>{initial}</Text>
        </View>
        <Text style={[styles.cardLabel, { color: colors.ink2 }]}>{label}</Text>
      </View>
      {entry.entry_type === 'voice' && entry.audio_url ? (
        <>
          <AudioPlayer audioPath={entry.audio_url} durationSeconds={entry.audio_duration_seconds ?? 0} accent={accent} />
          {!!entry.transcript && (
            <Text style={{ fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21.5, color: colors.ink2, marginTop: 10 }}>
              “{entry.transcript}”
            </Text>
          )}
        </>
      ) : (
        <Text style={{ fontFamily: fonts.serif, fontSize: 16, lineHeight: 25.6, color: colors.ink, marginTop: 11 }}>{entry.text_content}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { textAlign: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 8 },
  errorActions: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 20 },
  header: { alignItems: 'center' },
  title: { fontFamily: fonts.serifLight, fontSize: 28, marginTop: 8 },
  ref: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6 },
  divider: { width: 140, height: 24, marginTop: 12, opacity: 0.85 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12 },
  amenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingVertical: 17 },
  amenBtnBusy: { opacity: 0.6 },
  amenLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
});
