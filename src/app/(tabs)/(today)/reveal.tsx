import { useEffect, useState, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { HandsPraying } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { Floral } from '../../../components/ui/Floral';
import { AudioPlayer } from '../../../components/AudioPlayer';
import { ReflectionResponses } from '../../../components/ReflectionResponses';
import { unseal } from '../../../lib/motion';
import { haptics } from '../../../lib/haptics';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useCouple } from '../../../providers/CoupleProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { profileInitial } from '../../../lib/couples';
import { supabase } from '../../../lib/supabase';
import { getResponsesForDay, EntryResponse } from '../../../lib/entryResponses';

export default function RevealScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { myEntry, partnerEntry, dayNumber, planDay, loading, refresh } = useTodayEntry();
  const { couplePlan, partner, refresh: refreshCouple } = useCouple();

  const myInitial = (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase() ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? 'P';
  const partnerName = partner?.display_name ?? 'Your partner';
  const totalDays = couplePlan?.plan?.duration_days;
  const isFinalDay = !!totalDays && dayNumber >= totalDays;

  const revealed = !!myEntry && !!partnerEntry;
  useEffect(() => {
    if (revealed) haptics.success();
  }, [revealed]);

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

  const onAmen = async () => {
    haptics.tap();
    await refreshCouple();
    if (isFinalDay) router.replace('/(tabs)/(today)/complete');
    else router.replace('/(tabs)/(today)');
  };

  if (loading && !revealed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!revealed) {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SectionEyebrow color={colors.accent2}>Revealed together</SectionEyebrow>
          <Text style={[styles.title, { color: colors.ink }]}>What you each wrote</Text>
          <Text style={[styles.ref, { color: colors.muted }]}>{planDay?.passage_reference}</Text>
          <Floral variant="divider" style={styles.divider} />
        </View>

        <Animated.View entering={unseal(0)}>
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
                initial={responsesByEntry[myEntry.id] ?? []}
                revision={responsesRev}
              />
            )}
          </EntryCard>
        </Animated.View>

        <Animated.View entering={unseal(1)}>
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
                initial={responsesByEntry[partnerEntry.id] ?? []}
                revision={responsesRev}
                entryText={partnerEntry.entry_type === 'text' ? partnerEntry.text_content : null}
              />
            )}
          </EntryCard>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onAmen} activeOpacity={0.85} style={[styles.amenBtn, { backgroundColor: colors.accent }]} accessibilityRole="button" accessibilityLabel="Amen, mark day complete">
          <HandsPraying size={16} color={colors.bg} weight="fill" />
          <Text style={[styles.amenLabel, { color: colors.bg }]}>Amen · mark day complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
        <AudioPlayer audioPath={entry.audio_url} durationSeconds={entry.audio_duration_seconds ?? 0} accent={accent} />
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
  amenLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
});
