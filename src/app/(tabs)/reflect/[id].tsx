import { useCallback, useEffect, useState, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { AudioPlayer } from '../../../components/AudioPlayer';
import { ReflectionResponses } from '../../../components/ReflectionResponses';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { profileInitial } from '../../../lib/couples';
import { supabase } from '../../../lib/supabase';
import { getReflectionDetail } from '../../../lib/reflections';
import { getResponsesForDay, EntryResponse } from '../../../lib/entryResponses';
import { fetchPassage } from '../../../lib/bible';

export default function ReflectionDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { partner } = useCouple();
  const params = useLocalSearchParams<{ id: string; day: string }>();
  const couplePlanId = params.id;
  const dayNumber = Number(params.day ?? 0);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passage, setPassage] = useState<string | null>(null);
  const [passageErr, setPassageErr] = useState(false);
  const [responsesByEntry, setResponsesByEntry] = useState<Record<string, EntryResponse[]>>({});
  const [responsesRev, setResponsesRev] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getReflectionDetail(couplePlanId, dayNumber);
        if (!alive) return;
        setData(d);
        setPassage(d.planDay?.passage_text ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // Responses load + stay live: a partner's heart or reply lands without
    // reopening the screen; `revision` re-syncs the cards to server truth.
    const loadResponses = () => {
      getResponsesForDay(couplePlanId, dayNumber)
        .then((r) => { if (alive) { setResponsesByEntry(r); setResponsesRev((n) => n + 1); } })
        .catch(() => {});
    };
    loadResponses();
    const channel = supabase
      .channel(`responses-${couplePlanId}-${dayNumber}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_responses', filter: `couple_plan_id=eq.${couplePlanId}` }, loadResponses)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [couplePlanId, dayNumber]);

  const reference: string | undefined = data?.planDay?.passage_reference;
  const loadPassage = useCallback(async () => {
    if (!reference) return;
    setPassageErr(false);
    try { setPassage(await fetchPassage(reference)); }
    catch { setPassageErr(true); }
  }, [reference]);

  // Live-fetch when the plan day has no seeded text (custom plans).
  useEffect(() => {
    if (data && !data.planDay?.passage_text && reference) loadPassage();
  }, [data, reference, loadPassage]);

  const partnerName = partner?.display_name ?? 'Your partner';
  const myInitial = (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase() ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? '?';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  const when = data?.mine?.submitted_at ?? data?.partner?.submitted_at;
  const dateLabel = when ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const title = data?.planDay?.passage_title ?? reference ?? `Day ${dayNumber}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="Reflections" onPress={() => router.back()} />

        <Text style={[styles.eyebrow, { color: colors.accent }]}>{dateLabel} · {reference}</Text>
        <Text variant="h2" italic style={styles.title}>{title}</Text>
        <Text style={[styles.plan, { color: colors.ink2 }]}>Day {dayNumber} · {data?.planTitle}</Text>
        <Floral variant="divider" style={styles.divider} />

        <View style={[styles.passageCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text variant="eyebrow" color={colors.muted}>The passage</Text>
          {passage ? (
            <Text style={[styles.passageText, { color: colors.ink }]}>{passage}</Text>
          ) : passageErr ? (
            <Text color={colors.ink2} style={styles.passageState}>Couldn't load the passage.</Text>
          ) : (
            <View style={styles.passageState}><ActivityIndicator color={colors.accent} /></View>
          )}
          <Text style={[styles.reference, { color: colors.ink2 }]}>{reference}</Text>
        </View>

        <Text variant="eyebrow" color={colors.muted} style={styles.section}>What you each wrote</Text>
        <ReflectionCard label="You wrote" voiceLabel="You recorded" initial={myInitial} entry={data?.mine} accent="primary" filled={false} colors={colors}>
          {data?.mine && (
            <ReflectionResponses entry={data.mine} couplePlanId={couplePlanId} dayNumber={dayNumber}
              canRespond={false} partnerName={partnerName} initial={responsesByEntry[data.mine.id] ?? []} revision={responsesRev} />
          )}
        </ReflectionCard>
        <ReflectionCard label={`${partnerName} wrote`} voiceLabel={`${partnerName} recorded`} initial={partnerInitial} entry={data?.partner} accent="partner" filled colors={colors}>
          {data?.partner && (
            <ReflectionResponses entry={data.partner} couplePlanId={couplePlanId} dayNumber={dayNumber}
              canRespond partnerName={partnerName} initial={responsesByEntry[data.partner.id] ?? []} revision={responsesRev}
              entryText={data.partner.entry_type === 'text' ? data.partner.text_content : data.partner.transcript} />
          )}
        </ReflectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReflectionCard({ label, voiceLabel, initial, entry, accent, filled, colors, children }: {
  label: string; voiceLabel: string; initial: string; entry: any; accent: 'primary' | 'partner'; filled: boolean; colors: any;
  children?: ReactNode;
}) {
  const isVoice = entry?.entry_type === 'voice' && entry?.audio_url;
  return (
    <View style={[styles.reflCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.reflHeader}>
        <View style={[styles.avatar, filled ? { backgroundColor: colors.accent2 } : { borderWidth: 1.5, borderColor: colors.accent2 }]}>
          <Text style={[styles.avatarInitial, { color: filled ? colors.surface : colors.accent }]}>{initial}</Text>
        </View>
        <Text style={[styles.reflWho, { color: colors.ink2 }]}>{isVoice ? voiceLabel : label}</Text>
      </View>
      {entry ? (
        isVoice ? (
          <>
            <AudioPlayer audioPath={entry.audio_url} durationSeconds={entry.audio_duration_seconds ?? 0} accent={accent} />
            {!!entry.transcript && (
              <Text style={[styles.transcript, { color: colors.ink2 }]}>“{entry.transcript}”</Text>
            )}
          </>
        ) : (
          <Text style={[styles.reflText, { color: colors.ink }]}>{entry.text_content}</Text>
        )
      ) : (
        <Text style={[styles.reflText, { color: colors.muted }]}>No reflection.</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 96 },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16 },
  title: { marginTop: 8, lineHeight: 30 },
  plan: { fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  divider: { width: 130, height: 26, marginTop: 12, opacity: 0.8 },
  passageCard: { marginTop: 18, borderWidth: 1, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18 },
  passageText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, marginTop: 10 },
  passageState: { marginTop: 12, alignItems: 'center' },
  reference: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'right', marginTop: 10 },
  section: { marginTop: 22 },
  reflCard: { marginTop: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  reflHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 12 },
  reflWho: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  reflText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, marginTop: 11 },
  transcript: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21.5, marginTop: 10 },
});
