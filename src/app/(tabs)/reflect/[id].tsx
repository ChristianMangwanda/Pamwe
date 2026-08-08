import { useEffect, useState, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BookOpen, CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
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
import { haptics } from '../../../lib/haptics';
import { getReflectionDetail } from '../../../lib/reflections';
import { getResponsesForDay, EntryResponse } from '../../../lib/entryResponses';
import { parseReference } from '../../../lib/bible';

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
  const [loadErr, setLoadErr] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [responsesByEntry, setResponsesByEntry] = useState<Record<string, EntryResponse[]>>({});
  const [responsesRev, setResponsesRev] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadErr(false);
    (async () => {
      try {
        const d = await getReflectionDetail(couplePlanId, dayNumber);
        if (!alive) return;
        setData(d);
      } catch {
        // A discarded error used to render the day with empty cards and a
        // spinner that never resolved; show the retry card instead.
        if (alive) setLoadErr(true);
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
  }, [couplePlanId, dayNumber, attempt]);

  const reference: string | undefined = data?.planDay?.passage_reference;

  // The passage used to be printed here in full, above the reflections, so
  // reopening a day meant scrolling past the whole reading to reach the words
  // you came back for. It is one tap away in the reader instead, where the
  // couple's highlights and notes are anyway.
  const parsed = reference ? parseReference(reference) : null;
  const openPassage = () => {
    if (!parsed?.chapter) return;
    haptics.tap();
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: {
        book: parsed.book.name,
        chapter: String(parsed.chapter),
        ...(parsed.verse ? { verse: String(parsed.verse) } : {}),
        ...(parsed.endVerse ? { to: String(parsed.endVerse) } : {}),
      },
    } as any, { withAnchor: true });
  };

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

  if (loadErr && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <BackLink label="Reflections" onPress={() => router.back()} />
          <View style={[styles.passageCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.passageText, { color: colors.ink }]}>
              We couldn't load this reflection. Check your connection and try again.
            </Text>
            <Button title="Try again" onPress={() => { setLoading(true); setAttempt((n) => n + 1); }} style={styles.retry} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const when = data?.mine?.submitted_at ?? data?.partner?.submitted_at;
  const dateLabel = when ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const title = data?.planDay?.passage_title ?? reference ?? `Day ${dayNumber}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Replies are composed here too, so the keyboard must not cover them. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackLink label="Reflections" onPress={() => router.back()} />

        <Text style={[styles.eyebrow, { color: colors.accent }]}>{dateLabel}</Text>
        <Text variant="h2" italic style={styles.title}>{title}</Text>
        <Text style={[styles.plan, { color: colors.ink2 }]}>Day {dayNumber} · {data?.planTitle}</Text>
        <Floral variant="divider" style={styles.divider} />

        {!!reference && (
          <TouchableOpacity
            onPress={openPassage}
            disabled={!parsed?.chapter}
            activeOpacity={0.75}
            accessibilityRole={parsed?.chapter ? 'button' : 'text'}
            accessibilityLabel={parsed?.chapter ? `Open ${reference}` : reference}
            style={[styles.banner, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}
          >
            <BookOpen size={17} color={colors.accent2} weight="regular" />
            <Text style={[styles.bannerText, { color: colors.accent }]} numberOfLines={1}>
              You read {reference}
            </Text>
            {!!parsed?.chapter && <CaretRight size={14} color={colors.muted} weight="bold" />}
          </TouchableOpacity>
        )}

        <Text variant="eyebrow" color={colors.muted} style={styles.section}>What you each wrote</Text>
        <ReflectionCard label="You wrote" voiceLabel="You recorded" initial={myInitial} entry={data?.mine} accent="primary" filled={false} colors={colors}>
          {data?.mine && (
            <ReflectionResponses entry={data.mine} couplePlanId={couplePlanId} dayNumber={dayNumber}
              canRespond={false} partnerName={partnerName} myUserId={user?.id}
              initial={responsesByEntry[data.mine.id] ?? []} revision={responsesRev} />
          )}
        </ReflectionCard>
        <ReflectionCard label={`${partnerName} wrote`} voiceLabel={`${partnerName} recorded`} initial={partnerInitial} entry={data?.partner} accent="partner" filled colors={colors}>
          {data?.partner && (
            <ReflectionResponses entry={data.partner} couplePlanId={couplePlanId} dayNumber={dayNumber}
              canRespond partnerName={partnerName} myUserId={user?.id}
              initial={responsesByEntry[data.partner.id] ?? []} revision={responsesRev}
              entryText={data.partner.entry_type === 'text' ? data.partner.text_content : data.partner.transcript} />
          )}
        </ReflectionCard>
      </ScrollView>
      </KeyboardAvoidingView>
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
  retry: { marginTop: 14 },
  banner: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
  },
  bannerText: { flex: 1, fontFamily: fonts.serifMedium, fontSize: 14 },
  section: { marginTop: 22 },
  reflCard: { marginTop: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  reflHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 12 },
  reflWho: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  reflText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, marginTop: 11 },
  transcript: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21.5, marginTop: 10 },
});
