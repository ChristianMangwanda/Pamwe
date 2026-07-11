import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkle, ArrowRight, BookOpen } from 'phosphor-react-native';
import { BottomSheet } from './ui/BottomSheet';
import { Text } from './ui/Text';
import { Floral } from './ui/Floral';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { askPamweHelp, HelpAnswer } from '../lib/askPamwe';
import { parseReference } from '../lib/bible';
import { haptics } from '../lib/haptics';

// The quiet in-app helper. Pamwe points, never preaches: it answers in a line
// or two and offers passage references to open, but never interprets Scripture.
// Ephemeral by design: no history, no chat, dismiss and it forgets.
const SUGGESTIONS = [
  'What should we read when we feel distant?',
  'How does the reveal work?',
  'A psalm for a hard day?',
];

export function AskPamweSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<HelpAnswer | null>(null);

  const run = async (q: string) => {
    const text = q.trim();
    if (!text || asking) return;
    haptics.tap();
    setQuery(text);
    setAsking(true);
    setAnswer(null);
    const result = await askPamweHelp(text);
    setAnswer(result);
    setAsking(false);
  };

  const openReference = (reference: string) => {
    const parsed = parseReference(reference);
    if (!parsed) return;
    haptics.tap();
    onClose();
    router.push({
      pathname: '/(tabs)/bible/[book]/[chapter]',
      params: { book: parsed.book.name, chapter: String(parsed.chapter ?? 1) },
    });
  };

  const reset = () => {
    setQuery('');
    setAnswer(null);
    setAsking(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={reset}>
      <View style={styles.header}>
        <Floral variant="corner" style={styles.floral} />
        <Text variant="eyebrow" color={colors.accent2}>Ask Pamwe</Text>
        <Text variant="h2" italic style={styles.title}>How can we help you read?</Text>
        <Text color={colors.muted} style={styles.sub}>
          Pamwe can point you to passages and help with the app. It won't interpret Scripture for you, that's yours to read together.
        </Text>
      </View>

      <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ask about a passage, a plan, or the app"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.ink }]}
          multiline
          maxLength={300}
          onSubmitEditing={() => run(query)}
          returnKeyType="search"
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => run(query)}
        disabled={asking || !query.trim()}
        style={[styles.askBtn, { backgroundColor: colors.accent, opacity: asking || !query.trim() ? 0.55 : 1 }]}
      >
        <Sparkle size={16} color={colors.bg} weight="fill" />
        <Text variant="cta" color={colors.bg} style={styles.askBtnText}>Ask Pamwe</Text>
      </TouchableOpacity>

      {!answer && !asking && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} activeOpacity={0.8} onPress={() => run(s)}
              style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
              <Text variant="chip" color={colors.accent2}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {asking && (
        <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>
      )}

      {answer && !asking && (
        <View style={styles.answerWrap}>
          {answer.kind === 'answer' && (
            <>
              <Text style={[styles.answerText, { color: colors.ink }]}>{answer.answer}</Text>
              {answer.references.length > 0 && (
                <View style={styles.refs}>
                  {answer.references.map((r) => (
                    <TouchableOpacity key={r.reference} activeOpacity={0.8} onPress={() => openReference(r.reference)}
                      style={[styles.refRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                      <BookOpen size={17} color={colors.accent2} weight="regular" />
                      <View style={styles.flex}>
                        <Text style={[styles.refRef, { color: colors.accent }]}>{r.reference}</Text>
                        {!!r.note && <Text style={[styles.refNote, { color: colors.muted }]}>{r.note}</Text>}
                      </View>
                      <ArrowRight size={14} color={colors.muted} weight="bold" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
          {answer.kind === 'off_topic' && (
            <Text style={[styles.gentle, { color: colors.ink2 }]}>{answer.message}</Text>
          )}
          {answer.kind === 'error' && (
            <Text style={[styles.gentle, { color: colors.ink2 }]}>{answer.message}</Text>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { marginBottom: 16 },
  floral: { position: 'absolute', top: -8, right: -10, width: 72, height: 72, opacity: 0.6 },
  title: { marginTop: 6 },
  sub: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  inputBox: { borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 60 },
  input: { fontFamily: fonts.sans, fontSize: 15, padding: 0 },
  askBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 12 },
  askBtnText: { letterSpacing: 0.9 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  loading: { paddingVertical: 28, alignItems: 'center' },
  answerWrap: { marginTop: 18 },
  answerText: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25 },
  refs: { marginTop: 14, gap: 8 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  refRef: { fontFamily: fonts.serifMedium, fontSize: 15 },
  refNote: { fontFamily: fonts.sans, fontSize: 11, marginTop: 1 },
  gentle: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 23, textAlign: 'center', paddingVertical: 8 },
});
