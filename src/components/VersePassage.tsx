import { Text as RNText, NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import { fonts } from '../constants/typography';
import { swatches, SwatchColor } from '../theme/tokens';
import { useTheme } from '../providers/ThemeProvider';
import type { BibleVerse } from '../lib/bible';

export type ReaderScale = 's' | 'm' | 'l' | 'xl';
export const READER_SIZES: Record<ReaderScale, number> = { s: 17, m: 19, l: 22, xl: 26 };

// Verse-by-verse flowing renderer (design: Fraunces 400, line-height 1.9, tappable
// spans, highlight background from the swatch, an inline mark when a verse has a note).
// Nested <Text> flows inline in RN; highlighted text stays ink-dark in both themes.
export function VersePassage({
  verses,
  scale = 'm',
  showNums = true,
  highlights = {},
  notedVerses,
  markInitials,
  onVerseLongPress,
  focusVerse,
  flashVerse,
  onFocusVerseLayout,
}: {
  verses: BibleVerse[];
  scale?: ReaderScale;
  showNums?: boolean;
  highlights?: Record<number, SwatchColor>;
  notedVerses?: Set<number>;
  /**
   * Verse to the initial of whoever marked it, yours included.
   *
   * It used to carry only your partner's, on the reasoning that you know what
   * you marked. But the point of a shared layer is reading the page and seeing
   * at a glance who found what, and with only one side attributed a bare mark
   * was ambiguous: it could be yours, or it could be theirs before their
   * profile loaded. Christian's call, 2026-08-02.
   */
  markInitials?: Record<number, string>;
  /** Long press, so a stray touch mid-scroll doesn't select a verse. */
  onVerseLongPress?: (verse: number) => void;
  /** Verse to locate on layout (jump target from the marks screen). */
  focusVerse?: number;
  /** Verse to render with a temporary "here it is" background. */
  flashVerse?: number | null;
  /** Called with the focus verse's y offset (relative to this component). */
  onFocusVerseLayout?: (y: number) => void;
}) {
  const { colors } = useTheme();
  const size = READER_SIZES[scale];

  const initialFor = (verse: number) => markInitials?.[verse];

  // Length of one verse's rendered string — must mirror the render below so
  // char offsets map onto onTextLayout's per-line text lengths. Every span the
  // render can add needs a term here or scroll-to-verse drifts: the note glyph
  // is ` ✎` (2), the mark's initial is a space plus the letter.
  const verseLen = (v: BibleVerse) => {
    const initial = initialFor(v.verse);
    return (showNums ? `${v.verse} `.length : 0) +
      v.text.length +
      (notedVerses?.has(v.verse) ? 2 : 0) +
      (initial ? initial.length + 1 : 0) +
      2;
  };

  // The whole chapter is ONE flowing <Text>, so a verse has no view to measure.
  // Instead: find the focus verse's character offset, then walk the laid-out
  // lines until the running text length passes it — that line's y is the target.
  const handleTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (focusVerse == null || !onFocusVerseLayout) return;
    let target = 0;
    for (const v of verses) {
      if (v.verse === focusVerse) break;
      target += verseLen(v);
    }
    let acc = 0;
    for (const line of e.nativeEvent.lines) {
      acc += line.text.length;
      if (acc > target) { onFocusVerseLayout(line.y); return; }
    }
  };

  return (
    <RNText
      style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: size * 1.9, color: colors.ink }}
      onTextLayout={focusVerse != null ? handleTextLayout : undefined}
    >
      {verses.map((v) => {
        const hl = highlights[v.verse];
        const bg = hl ? swatches[hl] : v.verse === flashVerse ? colors.line2 : undefined;
        return (
          <RNText
            key={v.verse}
            // Long press, not tap: a tap selected whatever verse your thumb
            // happened to touch while scrolling, which fought the reading.
            onLongPress={onVerseLongPress ? () => onVerseLongPress(v.verse) : undefined}
            style={bg ? { backgroundColor: bg, color: hl ? swatches.highlightInk : colors.ink } : undefined}
          >
            {showNums ? (
              <RNText style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.accent2 }}>{v.verse} </RNText>
            ) : null}
            {v.text}
            {notedVerses?.has(v.verse) ? <RNText style={{ color: colors.accent2 }}> ✎</RNText> : null}
            {initialFor(v.verse) ? (
              <RNText style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.accent }}>
                {' '}{initialFor(v.verse)}
              </RNText>
            ) : null}
            {'  '}
          </RNText>
        );
      })}
    </RNText>
  );
}
