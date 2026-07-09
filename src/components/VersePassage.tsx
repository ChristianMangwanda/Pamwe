import { Text as RNText } from 'react-native';
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
  onVersePress,
}: {
  verses: BibleVerse[];
  scale?: ReaderScale;
  showNums?: boolean;
  highlights?: Record<number, SwatchColor>;
  notedVerses?: Set<number>;
  onVersePress?: (verse: number) => void;
}) {
  const { colors } = useTheme();
  const size = READER_SIZES[scale];

  return (
    <RNText style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: size * 1.9, color: colors.ink }}>
      {verses.map((v) => {
        const hl = highlights[v.verse];
        const bg = hl ? swatches[hl] : undefined;
        return (
          <RNText
            key={v.verse}
            onPress={onVersePress ? () => onVersePress(v.verse) : undefined}
            style={bg ? { backgroundColor: bg, color: swatches.highlightInk } : undefined}
          >
            {showNums ? (
              <RNText style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.accent2 }}>{v.verse} </RNText>
            ) : null}
            {v.text}
            {notedVerses?.has(v.verse) ? <RNText style={{ color: colors.accent2 }}> ✎</RNText> : null}
            {'  '}
          </RNText>
        );
      })}
    </RNText>
  );
}
