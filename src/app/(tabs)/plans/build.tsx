import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sparkle, ArrowClockwise } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Button } from '../../../components/ui/Button';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { buildPlan, BuiltPlan } from '../../../lib/askPamwe';
import { createCustomPlan } from '../../../lib/planBuilder';
import { enrollInPlan, Cadence } from '../../../lib/plans';
import { haptics } from '../../../lib/haptics';

const STARTERS = [
  'learning to trust again after a hard year',
  'what the New Testament says about faith',
  'praying together when we disagree',
  'waiting on something that has not come',
];

export default function BuildPlanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, refresh: refreshCouple } = useCouple();
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [text, setText] = useState(q ?? '');
  const [plan, setPlan] = useState<BuiltPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // A seed from the search field builds once on arrival, never again on
  // re-render, so editing the text does not fire a second generation.
  const seeded = useRef(false);

  const generate = useCallback(async (input: string) => {
    const q2 = input.trim();
    if (!q2 || busy) return;
    setBusy(true);
    setNote(null);
    setPlan(null);
    const res = await buildPlan(q2);
    setBusy(false);
    if (res.kind === 'plan') { setPlan(res.plan); haptics.success(); }
    else setNote(res.message);
  }, [busy]);

  useEffect(() => {
    if (seeded.current || !q?.trim()) return;
    seeded.current = true;
    generate(q);
  }, [q, generate]);

  const persist = () => {
    if (!couple?.id || !plan) return null;
    return createCustomPlan(couple.id, {
      name: plan.title,
      days: plan.days,
      readings: plan.readings.map((r) => r.reference),
      prompts: plan.prompts,
      rhythmLabel: plan.meta,
      bookLabel: plan.meta.split('·')[0]?.trim() || undefined,
      topics: plan.topics,
    });
  };

  const start = async () => {
    if (!couple?.id || !plan || starting || saving) return;
    setStarting(true);
    try {
      const created = await persist();
      if (!created) return;
      await enrollInPlan(couple.id, created.id, 1 as Cadence);
      await refreshCouple();
      haptics.celebrate();
      router.replace('/(tabs)/today');
    } catch (e: any) {
      setStarting(false);
      Alert.alert("Couldn't start it", e?.message ?? 'Try again in a moment.');
    }
  };

  // Save writes the plan but no enrolment. Starting retires whatever the couple
  // is reading now, so a good plan built at the wrong moment used to have to be
  // thrown away: the result only ever lived in this screen's state.
  const save = async () => {
    if (!couple?.id || !plan || starting || saving) return;
    setSaving(true);
    try {
      await persist();
      haptics.success();
      router.replace('/(tabs)/plans');
    } catch (e: any) {
      setSaving(false);
      Alert.alert("Couldn't save it", e?.message ?? 'Try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <BackLink label="Plans" onPress={() => router.back()} />
          <Text variant="h1" style={styles.title}>Build a plan</Text>
          <Text style={[styles.blurb, { color: colors.ink2 }]}>
            What does this current moment in your life need? Pamwe will help you find what you need.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <TextInput
              style={[styles.input, { color: colors.ink }]}
              placeholder="A season, a question, a book, a theme"
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
              accessibilityLabel="What to build a plan about"
            />
          </View>

          {!plan && !busy && (
            <View style={styles.starters}>
              {STARTERS.map((s) => (
                <TouchableOpacity key={s} activeOpacity={0.8}
                  onPress={() => { haptics.tap(); setText(s); generate(s); }}
                  style={[styles.starter, { borderColor: colors.lineAccent, backgroundColor: colors.surface2 }]}>
                  <Text style={[styles.starterText, { color: colors.ink2 }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            title={plan ? 'Build another' : 'Build the plan'}
            onPress={() => generate(text)}
            loading={busy}
            disabled={!text.trim()}
            variant={plan ? 'secondary' : 'primary'}
            style={styles.cta}
          />

          {busy && (
            <View style={styles.loading}>
              <PamweLoading />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Reading, and shaping the days.</Text>
            </View>
          )}

          {note && !busy && (
            <View style={[styles.note, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
              <Text style={[styles.noteText, { color: colors.ink2 }]}>{note}</Text>
            </View>
          )}

          {plan && !busy && (
            <View style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}>
              <View style={styles.resultHead}>
                <Sparkle size={15} color={colors.accent2} weight="fill" />
                <Text variant="eyebrow" color={colors.accent2}>Your plan</Text>
              </View>
              <Text variant="h2" style={styles.resultTitle}>{plan.title}</Text>
              <Text style={[styles.resultMeta, { color: colors.muted }]}>{plan.meta}</Text>

              <Floral variant="divider" style={styles.divider} />

              {plan.readings.map((r) => (
                <View key={r.day} style={[styles.day, { borderTopColor: colors.line2 }]}>
                  <Text style={[styles.dayNum, { color: colors.muted }]}>Day {r.day}</Text>
                  <View style={styles.flex}>
                    <Text style={[styles.dayRef, { color: colors.ink }]}>{r.reference}</Text>
                    {!!r.note && <Text style={[styles.dayNote, { color: colors.ink2 }]}>{r.note}</Text>}
                  </View>
                </View>
              ))}

              <Button title="Start together" onPress={start} loading={starting} disabled={saving} style={styles.start} />
              <Button title="Save for later" variant="secondary" onPress={save} loading={saving} disabled={starting} style={styles.save} />
              <TouchableOpacity onPress={() => generate(text)} activeOpacity={0.7} style={styles.again}
                accessibilityRole="button" accessibilityLabel="Build a different plan">
                <ArrowClockwise size={13} color={colors.accent2} weight="bold" />
                <Text variant="chip" color={colors.accent2}>Try a different shape</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48 },
  title: { marginTop: 12 },
  blurb: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 6 },
  inputWrap: { borderWidth: 1, borderRadius: 16, marginTop: 18, paddingHorizontal: 16, paddingVertical: 6 },
  input: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, minHeight: 76, paddingVertical: 10 },
  starters: { gap: 7, marginTop: 12 },
  starter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  starterText: { fontFamily: fonts.sans, fontSize: 13 },
  cta: { marginTop: 14 },
  loading: { alignItems: 'center', marginTop: 28, gap: 12 },
  loadingText: { fontFamily: fonts.sans, fontSize: 13 },
  note: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16 },
  noteText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, textAlign: 'center' },

  result: { borderWidth: 1, borderRadius: 18, padding: 18, marginTop: 20 },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  resultTitle: { marginTop: 8 },
  resultMeta: { fontFamily: fonts.sansSemiBold, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6 },
  divider: { width: 130, height: 24, marginVertical: 12, opacity: 0.8 },
  day: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingVertical: 9 },
  dayNum: { fontFamily: fonts.sansSemiBold, fontSize: 9.5, letterSpacing: 1.3, textTransform: 'uppercase', width: 44, paddingTop: 3 },
  dayRef: { fontFamily: fonts.serif, fontSize: 15 },
  dayNote: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  start: { marginTop: 20 },
  save: { marginTop: 10 },
  again: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
});
