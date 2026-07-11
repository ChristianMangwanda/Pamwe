import { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MagnifyingGlass, ArrowBendDownRight, BookmarksSimple, CaretRight } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { BIBLE_BOOKS, parseReference } from '../../../lib/bible';
import { getAllMarks } from '../../../lib/verseMarks';
import { haptics } from '../../../lib/haptics';

export default function BibleBooks() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [query, setQuery] = useState('');
  const [markCount, setMarkCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!couple?.id) return;
      getAllMarks(couple.id)
        .then((m) => setMarkCount(m.highlights.length + m.notes.length))
        .catch(() => {});
    }, [couple?.id]),
  );

  const jump = useMemo(() => (query.trim() ? parseReference(query) : null), [query]);

  const { old: oldT, neu: newT } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (n: string) => !q || n.toLowerCase().includes(q);
    return {
      old: BIBLE_BOOKS.filter((b) => b.testament === 'old' && match(b.name)),
      neu: BIBLE_BOOKS.filter((b) => b.testament === 'new' && match(b.name)),
    };
  }, [query]);

  const openBook = (name: string) => router.push(`/(tabs)/bible/${encodeURIComponent(name)}` as any);
  const onJump = () => {
    if (!jump) return;
    haptics.tap();
    if (jump.chapter) router.push(`/(tabs)/bible/${encodeURIComponent(jump.book.name)}/${jump.chapter}` as any);
    else openBook(jump.book.name);
  };

  const marksSub =
    markCount === null ? 'Everything you’ve marked, together' : markCount === 0 ? 'Nothing marked yet' : `${markCount} marked`;

  return (
    <Screen>
      <Text variant="h1" style={styles.title}>Bible</Text>
      <Text italic color={colors.ink2} style={styles.subtitle}>Read any passage. World English Bible.</Text>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <MagnifyingGlass size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.ink }]}
          placeholder="Find a book or reference (e.g. John 3)"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {jump && (
        <TouchableOpacity onPress={onJump} activeOpacity={0.85} style={[styles.jump, { backgroundColor: colors.accent }]}>
          <ArrowBendDownRight size={19} color={colors.bg} />
          <View style={styles.jumpText}>
            <Text style={[styles.jumpLabel, { color: colors.bg }]}>
              {jump.book.name}{jump.chapter ? ` ${jump.chapter}` : ''}
            </Text>
            <Text style={[styles.jumpSub, { color: colors.bg }]}>{jump.chapter ? 'Open chapter' : 'Open book'}</Text>
          </View>
          <CaretRight size={15} color={colors.bg} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/bible/marks' as any)}
        activeOpacity={0.85}
        style={[styles.marksEntry, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}
      >
        <BookmarksSimple size={22} color={colors.accent2} weight="fill" />
        <View style={styles.jumpText}>
          <Text style={[styles.marksTitle, { color: colors.accent }]}>My highlights & notes</Text>
          <Text color={colors.muted} style={styles.marksSub}>{marksSub}</Text>
        </View>
        <CaretRight size={16} color={colors.accent2} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/bible/search' as any)}
        activeOpacity={0.85}
        style={[styles.searchEntry, { borderColor: colors.line }]}
      >
        <MagnifyingGlass size={18} color={colors.accent2} weight="regular" />
        <Text style={[styles.searchEntryText, { color: colors.accent }]}>Search your notes & reflections</Text>
        <CaretRight size={15} color={colors.accent2} />
      </TouchableOpacity>

      {oldT.length > 0 && <BookList label="Old Testament" books={oldT} onOpen={openBook} />}
      {newT.length > 0 && <BookList label="New Testament" books={newT} onOpen={openBook} />}
      {oldT.length === 0 && newT.length === 0 && !jump && (
        <Text color={colors.muted} style={styles.empty}>No books match "{query}".</Text>
      )}
    </Screen>
  );
}

function BookList({ label, books, onOpen }: { label: string; books: typeof BIBLE_BOOKS; onOpen: (n: string) => void }) {
  const { colors } = useTheme();
  return (
    <View>
      <SectionEyebrow style={styles.sectionLabel}>{label}</SectionEyebrow>
      <View>
        {books.map((b) => (
          <TouchableOpacity
            key={b.name}
            onPress={() => onOpen(b.name)}
            activeOpacity={0.7}
            style={[styles.bookRow, { borderBottomColor: colors.line2 }]}
          >
            <Text style={[styles.bookName, { color: colors.ink }]}>{b.name}</Text>
            <Text color={colors.muted} style={styles.bookSub}>{b.chapters} {b.chapters === 1 ? 'chapter' : 'chapters'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 6 },
  search: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15 },
  jump: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  jumpText: { flex: 1 },
  jumpLabel: { fontFamily: fonts.serifMedium, fontSize: 16 },
  jumpSub: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7, marginTop: 1 },
  marksEntry: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16 },
  marksTitle: { fontFamily: fonts.serifMedium, fontSize: 15 },
  marksSub: { fontSize: 11, marginTop: 1 },
  searchEntry: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 },
  searchEntryText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13 },
  sectionLabel: { marginTop: 22, marginBottom: 8 },
  bookRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 2, borderBottomWidth: 1 },
  bookName: { fontFamily: fonts.serif, fontSize: 18 },
  bookSub: { fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 24 },
});
