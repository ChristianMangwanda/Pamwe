import { useMemo, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { CaretLeft, Sparkle, MagnifyingGlass, Check, ArrowRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { Switch } from '../../../components/ui/Switch';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { overlayIn, popIn } from '../../../lib/motion';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { BIBLE_BOOKS } from '../../../lib/bible';
import { askPamwe, PlanRecommendation } from '../../../lib/askPamwe';
import { createCustomPlan, generateSchedule } from '../../../lib/planBuilder';
import { haptics } from '../../../lib/haptics';

type Mode = 'books' | 'topics' | 'ask';
const MODES = [
  { key: 'books' as const, label: 'Books' },
  { key: 'topics' as const, label: 'Topics' },
  { key: 'ask' as const, label: 'Ask Pamwe' },
];
const LENGTHS = [7, 14, 21, 30];
const RHYTHMS = [
  { key: 'verses' as const, label: 'A few verses' },
  { key: 'chapter' as const, label: 'A chapter' },
  { key: 'deep' as const, label: 'Go deep' },
];
const RHYTHM_LABEL: Record<string, string> = {
  verses: 'A few verses a day',
  chapter: 'One chapter a day',
  deep: 'A longer sitting',
};
const TOPICS: { label: string; query: string }[] = [
  { label: 'Marriage', query: 'Scripture on building a strong, God-centered marriage.' },
  { label: 'Anxiety', query: 'Passages for a couple walking through anxiety and worry.' },
  { label: 'Forgiveness', query: 'A plan on learning to forgive each other.' },
  { label: 'Gratitude', query: 'Readings to grow in gratitude together.' },
  { label: 'Grief', query: 'Comfort from Scripture while grieving together.' },
  { label: 'New season', query: 'Guidance for a couple starting a new season of life.' },
  { label: 'Rest', query: 'Passages about Sabbath, rest, and trusting God.' },
  { label: 'Money', query: 'What the Bible says about money and generosity for a couple.' },
];

export default function BuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { couple } = useCouple();

  const [step, setStep] = useState(0); // 0 pick · 1 length · 2 rhythm · 3 review
  const [mode, setMode] = useState<Mode>('books');
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [askQuery, setAskQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [recs, setRecs] = useState<PlanRecommendation[]>([]);
  const [selectedRec, setSelectedRec] = useState<PlanRecommendation | null>(null);
  const [name, setName] = useState('');
  const [days, setDays] = useState(21);
  const [rhythm, setRhythm] = useState<'verses' | 'chapter' | 'deep'>('chapter');
  const [reflectTogether, setReflectTogether] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const books = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    return q ? BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(q)) : BIBLE_BOOKS;
  }, [bookQuery]);

  const pickedFromBooks = mode === 'books' && !!selectedBook;
  const pickedFromRec = (mode === 'topics' || mode === 'ask') && !!selectedRec;
  const hasPick = pickedFromBooks || pickedFromRec;

  const runAsk = async (query: string) => {
    if (!query.trim()) return;
    haptics.tap();
    setAsking(true);
    setSelectedRec(null);
    try {
      const results = await askPamwe(query);
      setRecs(results);
    } finally {
      setAsking(false);
    }
  };

  const chooseRec = (rec: PlanRecommendation) => {
    haptics.tap();
    setSelectedRec(rec);
    setDays(rec.days);
    setRhythm(rec.rhythm);
    if (!name.trim()) setName(rec.title);
  };

  const chooseBook = (bookName: string) => {
    haptics.tap();
    setSelectedBook(bookName);
    if (!name.trim()) setName(`${bookName}, together`);
  };

  const next = () => { haptics.tap(); setStep((s) => Math.min(3, s + 1)); };
  const back = () => {
    if (step === 0) { router.back(); return; }
    haptics.tap();
    setStep((s) => s - 1);
  };

  const create = async () => {
    if (!couple?.id) { Alert.alert('Not connected', 'You need a partner before building a plan.'); return; }
    const readings = pickedFromRec && selectedRec
      ? selectedRec.readings
      : generateSchedule(selectedBook ?? 'Genesis', 1, days);
    const finalName = name.trim() || selectedRec?.title || `${selectedBook ?? 'Custom'} plan`;
    try {
      setCreating(true);
      const plan = await createCustomPlan(couple.id, {
        name: finalName,
        days,
        readings,
        prompts: selectedRec?.prompts,
        rhythmLabel: RHYTHM_LABEL[rhythm],
        bookLabel: pickedFromBooks ? selectedBook ?? undefined : selectedRec?.meta,
      });
      haptics.celebrate();
      setCreatedId(plan.id);
    } catch (err: any) {
      setCreating(false);
      Alert.alert("Couldn't create the plan", err?.message ?? 'Try again in a moment.');
    }
  };

  // ---- Success ----
  if (createdId) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={styles.successWrap}>
          <Animated.View entering={popIn} style={[styles.successRing, { borderColor: colors.accent2 }]}>
            <Check size={34} color={colors.accent} weight="bold" />
          </Animated.View>
          <Text variant="h2" italic style={styles.successTitle}>Your plan is ready</Text>
          <Text color={colors.ink2} style={styles.successText}>
            “{name.trim() || 'Your plan'}” is saved under your plans. Open it to begin together.
          </Text>
          <View style={styles.successCtas}>
            <Button title="View plan" onPress={() => router.replace({ pathname: '/(tabs)/plans/[id]', params: { id: createdId } })} />
            <Button title="Done" variant="ghost" onPress={() => router.replace('/(tabs)/plans')} />
          </View>
        </View>
      </View>
    );
  }

  const recommendedFor = pickedFromRec ? selectedRec?.days : null;
  const sourceLabel = pickedFromRec ? selectedRec?.meta : selectedBook ? `Starting in ${selectedBook}` : '';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.View entering={overlayIn} style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <CaretLeft size={22} color={colors.accent} weight="bold" />
          </TouchableOpacity>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.accent : colors.line2 }]} />
            ))}
          </View>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Text variant="h1">Build a plan</Text>
              <Text color={colors.ink2} style={styles.sub}>Pick a book, a topic, or ask Pamwe for an idea.</Text>
              <SegmentedControl segments={MODES} value={mode} onChange={(m) => setMode(m)} style={styles.modeSeg} />

              {mode === 'books' && (
                <>
                  <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                    <MagnifyingGlass size={17} color={colors.muted} weight="regular" />
                    <TextInput
                      value={bookQuery}
                      onChangeText={setBookQuery}
                      placeholder="Search books"
                      placeholderTextColor={colors.muted}
                      style={[styles.searchInput, { color: colors.ink }]}
                    />
                  </View>
                  <View style={styles.bookList}>
                    {books.map((b) => {
                      const sel = selectedBook === b.name;
                      return (
                        <TouchableOpacity key={b.name} activeOpacity={0.8} onPress={() => chooseBook(b.name)}
                          accessibilityRole="button" accessibilityLabel={b.name} accessibilityState={{ selected: sel }}
                          style={[styles.bookRow, { backgroundColor: colors.surface, borderColor: sel ? colors.accent : colors.line, borderWidth: sel ? 2 : 1 }]}>
                          <Text style={[styles.bookName, { color: colors.ink }]}>{b.name}</Text>
                          <Text style={[styles.bookMeta, { color: colors.muted }]}>{b.chapters} ch</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {mode === 'topics' && (
                <>
                  <View style={styles.chips}>
                    {TOPICS.map((t) => {
                      const sel = activeTopic === t.label;
                      return (
                        <TouchableOpacity key={t.label} activeOpacity={0.8} disabled={asking}
                          onPress={() => { setActiveTopic(t.label); runAsk(t.query); }}
                          accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: sel }}
                          style={[styles.chip, {
                            backgroundColor: sel ? colors.accent : colors.surface2,
                            borderColor: sel ? colors.accent : colors.lineAccent,
                            opacity: asking && !sel ? 0.5 : 1,
                          }]}>
                          <Text variant="chip" color={sel ? colors.bg : colors.accent2}>{t.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <RecResults asking={asking} recs={recs} selected={selectedRec} onChoose={chooseRec} colors={colors} />
                </>
              )}

              {mode === 'ask' && (
                <>
                  <View style={[styles.askBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                    <TextInput
                      value={askQuery}
                      onChangeText={setAskQuery}
                      placeholder="e.g. We're anxious about a big move. What should we read?"
                      placeholderTextColor={colors.muted}
                      multiline
                      style={[styles.askInput, { color: colors.ink }]}
                    />
                  </View>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => runAsk(askQuery)} disabled={asking || !askQuery.trim()}
                    style={[styles.askBtn, { backgroundColor: colors.accent, opacity: asking || !askQuery.trim() ? 0.55 : 1 }]}>
                    <Sparkle size={16} color={colors.bg} weight="fill" />
                    <Text variant="cta" color={colors.bg} style={styles.askBtnText}>Ask Pamwe</Text>
                  </TouchableOpacity>
                  <RecResults asking={asking} recs={recs} selected={selectedRec} onChoose={chooseRec} colors={colors} />
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Text variant="h1">How long?</Text>
              <Text color={colors.ink2} style={styles.sub}>Pick how many days you'll read together.</Text>
              <View style={styles.lengths}>
                {LENGTHS.map((d) => {
                  const sel = days === d;
                  const rec = recommendedFor === d;
                  return (
                    <TouchableOpacity key={d} activeOpacity={0.85} onPress={() => { haptics.tap(); setDays(d); }}
                      accessibilityRole="button" accessibilityLabel={`${d} days`} accessibilityState={{ selected: sel }}
                      style={[styles.lengthCard, { backgroundColor: colors.surface, borderColor: sel ? colors.accent : colors.line, borderWidth: sel ? 2 : 1 }]}>
                      <Text style={[styles.lengthNum, { color: sel ? colors.accent : colors.ink }]}>{d}</Text>
                      <Text style={[styles.lengthLabel, { color: colors.muted }]}>days</Text>
                      {rec && <Text variant="chip" color={colors.accent2} style={styles.recBadge}>Recommended</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text variant="h1">Your rhythm</Text>
              <Text color={colors.ink2} style={styles.sub}>How much do you want to read each day?</Text>
              <SegmentedControl segments={RHYTHMS} value={rhythm} onChange={(r) => setRhythm(r)} style={styles.modeSeg} />
              <View style={[styles.reflectRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={styles.flex}>
                  <Text style={[styles.reflectTitle, { color: colors.ink }]}>Reflect together</Text>
                  <Text style={[styles.reflectSub, { color: colors.muted }]}>Journal and reveal after each reading.</Text>
                </View>
                <Switch value={reflectTogether} onValueChange={setReflectTogether} accessibilityLabel="Reflect together" />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text variant="h1">Ready?</Text>
              <Text color={colors.ink2} style={styles.sub}>Give your plan a name and review it.</Text>
              <View style={[styles.nameBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name your plan"
                  placeholderTextColor={colors.muted}
                  style={[styles.nameInput, { color: colors.ink }]}
                />
              </View>
              <View style={[styles.review, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                <ReviewRow label="Source" value={sourceLabel || '·'} colors={colors} />
                <ReviewRow label="Length" value={`${days} days`} colors={colors} />
                <ReviewRow label="Rhythm" value={RHYTHM_LABEL[rhythm]} colors={colors} />
                <ReviewRow label="Reflect together" value={reflectTogether ? 'Yes' : 'No'} colors={colors} last />
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 }]}>
          {step < 3 ? (
            <Button title={step === 0 ? 'Continue' : 'Next'} onPress={next} disabled={step === 0 && !hasPick} />
          ) : (
            <Button title="Create plan" onPress={create} loading={creating} disabled={creating} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function RecResults({ asking, recs, selected, onChoose, colors }: {
  asking: boolean;
  recs: PlanRecommendation[];
  selected: PlanRecommendation | null;
  onChoose: (r: PlanRecommendation) => void;
  colors: any;
}) {
  if (asking) {
    return <View style={styles.recLoading}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (recs.length === 0) return null;
  return (
    <View style={styles.recList}>
      {recs.map((r, i) => {
        const sel = selected === r;
        return (
          <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => onChoose(r)}
            accessibilityRole="button" accessibilityLabel={r.title} accessibilityState={{ selected: sel }}
            style={[styles.recCard, { backgroundColor: colors.surface, borderColor: sel ? colors.accent : colors.line, borderWidth: sel ? 2 : 1 }]}>
            <View style={styles.flex}>
              <Text style={[styles.recTitle, { color: colors.ink }]}>{r.title}</Text>
              <Text style={[styles.recMeta, { color: colors.muted }]}>{r.meta}</Text>
            </View>
            {sel ? <Check size={18} color={colors.accent} weight="bold" /> : <ArrowRight size={15} color={colors.accent2} weight="regular" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReviewRow({ label, value, colors, last }: { label: string; value: string; colors: any; last?: boolean }) {
  return (
    <View style={[styles.reviewRow, !last && { borderBottomColor: colors.lineAccent, borderBottomWidth: 1 }]}>
      <Text variant="chip" color={colors.muted}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.ink }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingBottom: 8 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  body: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 24 },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  modeSeg: { marginTop: 18 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15, padding: 0 },
  bookList: { marginTop: 12, gap: 8 },
  bookRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  bookName: { fontFamily: fonts.serifMedium, fontSize: 16 },
  bookMeta: { fontFamily: fonts.sans, fontSize: 11 },
  chips: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  askBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  askInput: { fontFamily: fonts.sans, fontSize: 15, minHeight: 70, textAlignVertical: 'top', padding: 0 },
  askBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 12 },
  askBtnText: { letterSpacing: 1 },
  recLoading: { paddingVertical: 40, alignItems: 'center' },
  recList: { marginTop: 18, gap: 10 },
  recCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15 },
  recTitle: { fontFamily: fonts.serifMedium, fontSize: 16 },
  recMeta: { fontFamily: fonts.sans, fontSize: 11, marginTop: 2 },
  lengths: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  lengthCard: { width: '48%', borderRadius: 16, paddingVertical: 22, alignItems: 'center' },
  lengthNum: { fontFamily: fonts.serifLight, fontSize: 34, lineHeight: 38 },
  lengthLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2 },
  recBadge: { marginTop: 8, fontSize: 8.5 },
  reflectRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 },
  reflectTitle: { fontFamily: fonts.serifMedium, fontSize: 16 },
  reflectSub: { fontFamily: fonts.sans, fontSize: 12, marginTop: 3 },
  nameBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginTop: 18 },
  nameInput: { fontFamily: fonts.serif, fontSize: 18, padding: 0 },
  review: { marginTop: 16, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, gap: 16 },
  reviewValue: { flex: 1, textAlign: 'right', fontFamily: fonts.serifMedium, fontSize: 15 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 10 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  successRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  successTitle: { marginTop: 22, textAlign: 'center' },
  successText: { marginTop: 12, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  successCtas: { marginTop: 28, alignSelf: 'stretch', gap: 10 },
});
