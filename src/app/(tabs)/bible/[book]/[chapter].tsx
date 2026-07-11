import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaretLeft, CaretRight, BookmarkSimple, Feather, Sun, Moon, X, Prohibit, NotePencil, HandTap } from 'phosphor-react-native';
import { Text } from '../../../../components/ui/Text';
import { Switch } from '../../../../components/ui/Switch';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { Floral } from '../../../../components/ui/Floral';
import { VersePassage, ReaderScale, READER_SIZES } from '../../../../components/VersePassage';
import { fonts } from '../../../../constants/typography';
import { GUTTER, swatches, SwatchColor } from '../../../../theme/tokens';
import { useTheme } from '../../../../providers/ThemeProvider';
import { useCouple } from '../../../../providers/CoupleProvider';
import { findBook, fetchChapterVerses, TRANSLATION_NAMES, TRANSLATION_ABBR, TRANSLATIONS, type Translation, type BibleVerse } from '../../../../lib/bible';
import { getMarksForChapter, setHighlight, clearHighlight, type VerseHighlight, type VerseNote } from '../../../../lib/verseMarks';
import { haptics } from '../../../../lib/haptics';

const SWATCH_KEYS: SwatchColor[] = ['amber', 'rose', 'sage', 'sky'];
const SIZE_KEYS: ReaderScale[] = ['s', 'm', 'l', 'xl'];

export default function ChapterReader() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { couple } = useCouple();
  const params = useLocalSearchParams<{ book: string; chapter: string; verse?: string; couplePlanId?: string; day?: string; planTitle?: string }>();
  const bookName = decodeURIComponent(params.book ?? '');
  const chapterNum = Number(params.chapter ?? 0);
  const book = findBook(bookName);
  // Jump target when arriving from the marks screen ("My highlights & notes").
  const focusVerse = params.verse ? Number(params.verse) : undefined;

  const [translation, setTranslation] = useState<Translation>('web');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState<ReaderScale>('m');
  const [showNums, setShowNums] = useState(true);
  const [typoOpen, setTypoOpen] = useState(false);
  const [transOpen, setTransOpen] = useState(false);

  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [selVerse, setSelVerse] = useState<number | null>(null);

  // Scroll-to-verse plumbing: the passage measures the focus verse's line y
  // (relative to itself); we add the passage's own offset in the scroll content.
  const scrollRef = useRef<ScrollView>(null);
  const [passageTop, setPassageTop] = useState(0);
  const [focusY, setFocusY] = useState<number | null>(null);
  const [flashVerse, setFlashVerse] = useState<number | null>(null);

  useEffect(() => { if (focusVerse) setFlashVerse(focusVerse); }, [focusVerse]);

  useEffect(() => {
    if (focusY == null || passageTop <= 0 || flashVerse == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(passageTop + focusY - 96, 0), animated: true });
    const t = setTimeout(() => setFlashVerse(null), 2400);
    return () => clearTimeout(t);
  }, [focusY, passageTop, flashVerse]);

  useEffect(() => {
    AsyncStorage.getItem('pamwe:readerScale').then((v) => { if (v) setScale(v as ReaderScale); });
    AsyncStorage.getItem('pamwe:verseNums').then((v) => { if (v != null) setShowNums(v === '1'); });
    AsyncStorage.getItem('pamwe:readerTranslation').then((v) => {
      if (v && (TRANSLATIONS as string[]).includes(v)) setTranslation(v as Translation);
    });
  }, []);

  const load = useCallback(async () => {
    if (!book || !chapterNum) { setError(true); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const data = await fetchChapterVerses(book.name, chapterNum, translation);
      setVerses(data.verses);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [book?.name, chapterNum, translation]);

  useEffect(() => { load(); }, [load]);

  const reloadMarks = useCallback(() => {
    if (!couple?.id || !book) return;
    getMarksForChapter(couple.id, book.name, chapterNum)
      .then((m) => { setHighlights(m.highlights); setNotes(m.notes); })
      .catch(() => {});
  }, [couple?.id, book?.name, chapterNum]);

  useFocusEffect(useCallback(() => { reloadMarks(); }, [reloadMarks]));

  if (!book || !chapterNum) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text variant="h2">Unknown passage</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/bible')} style={{ marginTop: 20 }}>
            <Text color={colors.accent} style={styles.link}>Back to Bible</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hlMap: Record<number, SwatchColor> = Object.fromEntries(highlights.map((h) => [h.verse, h.color]));
  const notedVerses = new Set(notes.map((n) => n.verse));
  const notesByVerse: Record<number, string> = Object.fromEntries(notes.map((n) => [n.verse, n.text]));

  const canPrev = chapterNum > 1;
  const canNext = chapterNum < book.chapters;
  const goChapter = (n: number) => router.replace(`/(tabs)/bible/${encodeURIComponent(book.name)}/${n}` as any);

  const changeScale = (s: ReaderScale) => { setScale(s); AsyncStorage.setItem('pamwe:readerScale', s); haptics.tap(); };
  const changeNums = (v: boolean) => { setShowNums(v); AsyncStorage.setItem('pamwe:verseNums', v ? '1' : '0'); };
  const changeTranslation = (t: Translation) => {
    setTranslation(t);
    AsyncStorage.setItem('pamwe:readerTranslation', t);
    setTransOpen(false);
    haptics.tap();
  };

  const onVersePress = (verse: number) => { haptics.tap(); setSelVerse(verse); };
  const applyHighlight = async (color: SwatchColor) => {
    if (!couple?.id || selVerse == null) return;
    haptics.light();
    try { await setHighlight(couple.id, book.name, chapterNum, selVerse, color); reloadMarks(); } catch {}
    setSelVerse(null);
  };
  const removeHighlight = async () => {
    if (!couple?.id || selVerse == null) return;
    haptics.tap();
    try { await clearHighlight(couple.id, book.name, chapterNum, selVerse); reloadMarks(); } catch {}
    setSelVerse(null);
  };
  const openNoteEditor = () => {
    if (selVerse == null) return;
    const text = notesByVerse[selVerse] ?? '';
    const v = selVerse;
    setSelVerse(null);
    router.push({ pathname: '/(tabs)/bible/note', params: { book: book.name, chapter: String(chapterNum), verse: String(v), text } } as any);
  };

  const selRef = selVerse != null ? `${book.name} ${chapterNum}:${selVerse}` : '';
  const selNote = selVerse != null ? notesByVerse[selVerse] : undefined;
  const hasCtx = !!(params.day && params.planTitle);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Device feedback: back link + translations + Aa in one row overflowed
            and overlapped on-device, so the translation control gets its own row. */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.chaptersLink} accessibilityRole="button" accessibilityLabel="Chapters">
            <CaretLeft size={15} color={colors.accent2} weight="bold" />
            <Text color={colors.accent2} style={styles.chaptersLabel}>Chapters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTypoOpen((o) => !o)}
            style={[styles.aa, { backgroundColor: colors.surface, borderColor: colors.line }]}
            accessibilityRole="button"
            accessibilityLabel="Reading options"
          >
            <Text style={[styles.aaText, { color: colors.accent }]}>Aa</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => { haptics.tap(); setTransOpen(true); }}
          activeOpacity={0.8}
          style={[styles.transPill, { backgroundColor: colors.surface, borderColor: colors.line }]}
          accessibilityRole="button"
          accessibilityLabel={`Translation: ${TRANSLATION_NAMES[translation]}`}
        >
          <Text style={[styles.transAbbr, { color: colors.accent }]}>{TRANSLATION_ABBR[translation]}</Text>
          <Text style={[styles.transName, { color: colors.muted }]} numberOfLines={1}>{TRANSLATION_NAMES[translation]}</Text>
          <CaretRight size={14} color={colors.muted} weight="bold" />
        </TouchableOpacity>

        {hasCtx && (
          <View style={[styles.banner, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
            <BookmarkSimple size={20} color={colors.accent2} weight="fill" />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.accent }]} numberOfLines={1}>{params.planTitle}</Text>
              <Text style={[styles.bannerDay, { color: colors.muted }]}>Day {params.day}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/(today)/journal')} style={[styles.reflectBtn, { backgroundColor: colors.accent }]}>
              <Feather size={13} color={colors.bg} />
              <Text style={[styles.reflectLabel, { color: colors.bg }]}>Reflect</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.title, { color: colors.ink }]}>{book.name} {chapterNum}</Text>
        <Text style={[styles.transFull, { color: colors.muted }]}>{TRANSLATION_NAMES[translation]}</Text>
        <Floral variant="divider" style={styles.divider} />

        {loading && <Text italic color={colors.muted} style={styles.loading}>Gathering the words…</Text>}

        {error && !loading && (
          <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text color={colors.ink2} style={styles.errorText}>Could not load this chapter. Check your connection and try again.</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
              <Text color={colors.accent} style={styles.link}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            <View onLayout={(e) => setPassageTop(e.nativeEvent.layout.y)}>
              <VersePassage
                verses={verses}
                scale={scale}
                showNums={showNums}
                highlights={hlMap}
                notedVerses={notedVerses}
                onVersePress={onVersePress}
                focusVerse={focusVerse}
                flashVerse={flashVerse}
                onFocusVerseLayout={setFocusY}
              />
            </View>
            <View style={styles.hint}>
              <HandTap size={14} color="#B7A88C" />
              <Text style={{ color: '#B7A88C', fontFamily: fonts.sans, fontSize: 12 }}>Tap a verse to highlight or note it.</Text>
            </View>
          </>
        )}

        <View style={styles.navRow}>
          <TouchableOpacity
            disabled={!canPrev}
            onPress={() => goChapter(chapterNum - 1)}
            style={[styles.navBtn, { borderColor: colors.line, opacity: canPrev ? 1 : 0.4 }]}
          >
            <CaretLeft size={14} color={colors.accent} weight="bold" />
            <Text style={[styles.navLabel, { color: colors.accent }]}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!canNext}
            onPress={() => goChapter(chapterNum + 1)}
            style={[styles.navBtn, styles.navNext, { backgroundColor: colors.accent, opacity: canNext ? 1 : 0.4 }]}
          >
            <Text style={[styles.navLabel, { color: colors.bg }]}>Next</Text>
            <CaretRight size={14} color={colors.bg} weight="bold" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {typoOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypoOpen(false)} />
          <View style={[styles.popover, { top: insets.top + 50, backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.popLabel, { color: colors.muted }]}>Text size</Text>
            <View style={[styles.sizeRow, { backgroundColor: colors.line2 }]}>
              {SIZE_KEYS.map((s) => {
                const active = s === scale;
                return (
                  <TouchableOpacity key={s} onPress={() => changeScale(s)} style={[styles.sizeCell, active && { backgroundColor: colors.accent }]}>
                    <Text style={{ fontFamily: fonts.serifMedium, fontSize: READER_SIZES[s] - 4, color: active ? colors.bg : colors.ink }}>A</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.popRow}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>Verse numbers</Text>
              <Switch value={showNums} onValueChange={changeNums} accessibilityLabel="Verse numbers" />
            </View>
            <View style={styles.popRow}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>Appearance</Text>
              <View style={[styles.themeToggle, { backgroundColor: colors.line2 }]}>
                <TouchableOpacity onPress={() => setMode('light')} style={[styles.themeCell, mode === 'light' && { backgroundColor: colors.accent }]}>
                  <Sun size={14} color={mode === 'light' ? colors.bg : colors.ink2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('dark')} style={[styles.themeCell, mode === 'dark' && { backgroundColor: colors.accent }]}>
                  <Moon size={14} color={mode === 'dark' ? colors.bg : colors.ink2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      <BottomSheet visible={selVerse != null} onClose={() => setSelVerse(null)}>
        <View style={styles.sheetHead}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>{selRef}</Text>
          <TouchableOpacity onPress={() => setSelVerse(null)} hitSlop={10}><X size={18} color={colors.muted} /></TouchableOpacity>
        </View>
        <Text style={[styles.sheetLabel, { color: colors.muted }]}>Highlight</Text>
        <View style={styles.swatchRow}>
          {SWATCH_KEYS.map((c) => (
            <TouchableOpacity key={c} onPress={() => applyHighlight(c)} style={[styles.swatch, { backgroundColor: swatches[c] }]} accessibilityLabel={`Highlight ${c}`} />
          ))}
          <TouchableOpacity onPress={removeHighlight} style={[styles.swatchClear, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityLabel="Clear highlight">
            <Prohibit size={18} color={colors.accent2} />
          </TouchableOpacity>
        </View>
        {selNote ? (
          <View style={[styles.notePreview, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.noteLabel, { color: colors.accent2 }]}>Your note</Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.ink }}>{selNote}</Text>
          </View>
        ) : null}
        <TouchableOpacity onPress={openNoteEditor} style={[styles.noteBtn, { borderColor: colors.accent2 }]}>
          <NotePencil size={16} color={colors.accent} />
          <Text style={[styles.noteBtnLabel, { color: colors.accent }]}>{selNote ? 'Edit note' : 'Add note'}</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={transOpen} onClose={() => setTransOpen(false)}>
        <View style={styles.sheetHead}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>Translation</Text>
          <TouchableOpacity onPress={() => setTransOpen(false)} hitSlop={10}><X size={18} color={colors.muted} /></TouchableOpacity>
        </View>
        {TRANSLATIONS.map((t) => {
          const on = t === translation;
          return (
            <TouchableOpacity key={t} onPress={() => changeTranslation(t)} activeOpacity={0.8}
              accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[styles.transRow, { borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.surface2 : 'transparent' }]}>
              <Text style={[styles.transRowAbbr, { color: colors.accent }]}>{TRANSLATION_ABBR[t]}</Text>
              <Text style={[styles.transRowName, { color: colors.ink }]}>{TRANSLATION_NAMES[t]}</Text>
            </TouchableOpacity>
          );
        })}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  link: { fontFamily: fonts.sansSemiBold, fontSize: 13 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chaptersLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chaptersLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
  transControl: { marginTop: 14 },
  transPill: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  transAbbr: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 0.6 },
  transName: { flex: 1, fontFamily: fonts.sans, fontSize: 13 },
  transRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  transRowAbbr: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 0.6, width: 40 },
  transRowName: { flex: 1, fontFamily: fonts.serif, fontSize: 15 },
  aa: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  aaText: { fontFamily: fonts.serifSemiBold, fontSize: 15 },
  banner: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16 },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: { fontFamily: fonts.serifMedium, fontSize: 14 },
  bannerDay: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 },
  reflectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13 },
  reflectLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.serifLight, fontSize: 32, lineHeight: 34, marginTop: 20 },
  transFull: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 5 },
  divider: { width: 140, height: 24, marginTop: 16, marginBottom: 4, opacity: 0.85 },
  loading: { paddingVertical: 60, textAlign: 'center', fontSize: 15 },
  errorCard: { marginTop: 20, borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center' },
  errorText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 },
  navRow: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15 },
  navNext: { borderWidth: 0 },
  navLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  popover: { position: 'absolute', right: GUTTER, width: 250, borderWidth: 1, borderRadius: 18, padding: 18, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 34, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  popLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  sizeRow: { marginTop: 9, flexDirection: 'row', gap: 5, borderRadius: 12, padding: 4 },
  sizeCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 9 },
  popRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeToggle: { flexDirection: 'row', gap: 4, borderRadius: 999, padding: 3 },
  themeCell: { width: 30, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 18 },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(43,31,20,0.12)' },
  swatchClear: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  notePreview: { marginTop: 20, borderWidth: 1, borderRadius: 14, padding: 14 },
  noteLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6 },
  noteBtn: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15 },
  noteBtnLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
});
