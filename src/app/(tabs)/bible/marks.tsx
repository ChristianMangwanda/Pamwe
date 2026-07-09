import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BookmarksSimple, NotePencil, CaretRight } from 'phosphor-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { BackLink } from '../../../components/ui/BackLink';
import { fonts } from '../../../constants/typography';
import { swatches } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { getAllMarks, type VerseHighlight, type VerseNote } from '../../../lib/verseMarks';

export default function MarksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!couple?.id) return;
      getAllMarks(couple.id)
        .then((m) => { setHighlights(m.highlights); setNotes(m.notes); })
        .catch(() => {})
        .finally(() => setLoaded(true));
    }, [couple?.id]),
  );

  const hlColorAt = (book: string, chapter: number, verse: number) =>
    highlights.find((h) => h.book === book && h.chapter === chapter && h.verse === verse)?.color;
  const hasNoteAt = (book: string, chapter: number, verse: number) =>
    notes.some((n) => n.book === book && n.chapter === chapter && n.verse === verse);

  const openVerse = (book: string, chapter: number) =>
    router.push(`/(tabs)/bible/${encodeURIComponent(book)}/${chapter}` as any);

  const isEmpty = loaded && highlights.length === 0 && notes.length === 0;

  return (
    <Screen>
      <BackLink onPress={() => router.back()} label="Bible" />
      <Text variant="h1" style={styles.title}>Highlights & notes</Text>
      <Text italic color={colors.ink2} style={styles.subtitle}>Everything you've marked, together.</Text>

      {isEmpty && (
        <View style={styles.empty}>
          <BookmarksSimple size={40} color="#CBB99B" />
          <Text color={colors.muted} style={styles.emptyText}>
            Nothing marked yet. Tap any verse while you read to highlight it or leave a note.
          </Text>
        </View>
      )}

      {notes.length > 0 && (
        <>
          <SectionEyebrow style={styles.sectionLabel}>Notes</SectionEyebrow>
          <View style={styles.list}>
            {notes.map((n) => {
              const color = hlColorAt(n.book, n.chapter, n.verse);
              return (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => openVerse(n.book, n.chapter)}
                  activeOpacity={0.8}
                  style={[styles.noteRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <View style={[styles.noteBar, { backgroundColor: color ? swatches[color] : colors.accent2 }]} />
                  <View style={styles.noteBody}>
                    <Text style={[styles.noteRef, { color: colors.accent2 }]}>{n.book} {n.chapter}:{n.verse}</Text>
                    <Text style={{ fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.ink, marginTop: 6 }}>{n.text}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {highlights.length > 0 && (
        <>
          <SectionEyebrow style={styles.sectionLabel}>Highlights</SectionEyebrow>
          <View style={styles.hlList}>
            {highlights.map((h) => (
              <TouchableOpacity
                key={h.id}
                onPress={() => openVerse(h.book, h.chapter)}
                activeOpacity={0.8}
                style={[styles.hlRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={[styles.hlDot, { backgroundColor: swatches[h.color] }]} />
                <Text style={{ flex: 1, fontFamily: fonts.serifMedium, fontSize: 15, color: colors.ink }}>{h.book} {h.chapter}:{h.verse}</Text>
                {hasNoteAt(h.book, h.chapter, h.verse) && <NotePencil size={14} color={colors.accent2} weight="fill" />}
                <CaretRight size={14} color="#CBB99B" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  empty: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 16 },
  sectionLabel: { marginTop: 24, marginBottom: 12 },
  list: { gap: 10 },
  noteRow: { flexDirection: 'row', gap: 13, borderWidth: 1, borderRadius: 16, padding: 15 },
  noteBar: { width: 4, borderRadius: 2 },
  noteBody: { flex: 1, minWidth: 0 },
  noteRef: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  hlList: { gap: 8 },
  hlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 },
  hlDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(43,31,20,0.12)' },
});
