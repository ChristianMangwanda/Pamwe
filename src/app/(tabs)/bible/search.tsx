import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, NotePencil, Highlighter, Feather, CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { searchSharedLayer, SearchResults } from '../../../lib/search';
import { parseReference } from '../../../lib/bible';
import { haptics } from '../../../lib/haptics';

// One search box over everything the couple has made together: notes,
// highlights, and revealed reflections. Debounced; each result jumps to source.
export default function SharedSearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    if (!couple?.id || q.trim().length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    searchSharedLayer(couple.id, q)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setSearching(false));
  }, [couple?.id]);

  const onChange = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(q), 300);
  };

  const openChapter = (book: string, chapter: number) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/bible/[book]/[chapter]', params: { book, chapter: String(chapter) } });
  };
  const openReflection = (couplePlanId: string, day: number) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/reflect/[id]', params: { id: couplePlanId, day: String(day) } });
  };

  const total = results ? results.notes.length + results.highlights.length + results.reflections.length : 0;
  const showEmpty = !!results && total === 0 && query.trim().length >= 2 && !searching;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackLink label="Bible" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Search together</Text>
        <Text color={colors.ink2} style={styles.sub}>Your notes, highlights, and reflections.</Text>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <MagnifyingGlass size={18} color={colors.muted} weight="regular" />
          <TextInput
            value={query}
            onChangeText={onChange}
            placeholder="Search a word, a verse, a theme"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.ink }]}
            autoFocus
            autoCorrect={false}
          />
          {searching && <ActivityIndicator color={colors.accent} />}
        </View>

        {showEmpty && (
          <Text color={colors.muted} style={styles.empty}>Nothing yet for "{query.trim()}".</Text>
        )}

        {results && results.reflections.length > 0 && (
          <View style={styles.group}>
            <SectionEyebrow style={styles.groupLabel}>Reflections</SectionEyebrow>
            {results.reflections.map((r) => (
              <TouchableOpacity key={r.id} activeOpacity={0.8} onPress={() => openReflection(r.couplePlanId, r.dayNumber)}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Feather size={17} color={colors.accent2} weight="regular" />
                <View style={styles.flex}>
                  <Text style={[styles.rowRef, { color: colors.accent }]}>{r.reference}</Text>
                  <Text style={[styles.rowText, { color: colors.ink }]} numberOfLines={2}>{r.snippet}</Text>
                </View>
                <CaretRight size={14} color={colors.muted} weight="bold" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {results && results.notes.length > 0 && (
          <View style={styles.group}>
            <SectionEyebrow style={styles.groupLabel}>Notes</SectionEyebrow>
            {results.notes.map((n) => (
              <TouchableOpacity key={n.id} activeOpacity={0.8} onPress={() => openChapter(n.book, n.chapter)}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <NotePencil size={17} color={colors.accent2} weight="regular" />
                <View style={styles.flex}>
                  <Text style={[styles.rowRef, { color: colors.accent }]}>{n.book} {n.chapter}:{n.verse}</Text>
                  <Text style={[styles.rowText, { color: colors.ink }]} numberOfLines={2}>{n.text}</Text>
                </View>
                <CaretRight size={14} color={colors.muted} weight="bold" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {results && results.highlights.length > 0 && (
          <View style={styles.group}>
            <SectionEyebrow style={styles.groupLabel}>Highlights</SectionEyebrow>
            {results.highlights.map((h) => (
              <TouchableOpacity key={h.id} activeOpacity={0.8} onPress={() => openChapter(h.book, h.chapter)}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Highlighter size={17} color={colors.accent2} weight="regular" />
                <View style={styles.flex}>
                  <Text style={[styles.rowRef, { color: colors.accent }]}>{h.book} {h.chapter}:{h.verse}</Text>
                </View>
                <CaretRight size={14} color={colors.muted} weight="bold" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  flex: { flex: 1, minWidth: 0 },
  title: { marginTop: 14 },
  sub: { fontSize: 14, marginTop: 6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, padding: 0 },
  empty: { fontSize: 14, marginTop: 24, textAlign: 'center' },
  group: { marginTop: 22 },
  groupLabel: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 8 },
  rowRef: { fontFamily: fonts.sansSemiBold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  rowText: { fontFamily: fonts.serif, fontSize: 14.5, lineHeight: 21, marginTop: 3 },
});
