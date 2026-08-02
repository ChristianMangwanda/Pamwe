import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text } from './ui/Text';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { cardCopy } from '../lib/grove';
import { TREE_SOURCES } from '../lib/groveArt';

// The You tab's Grove card: a CROP of the same walk, not a portrait of one
// tree. Your trees at the size they stand, with the next one pale at the end of
// the row. No path here, the trees carry it.
const ROW_H = 92;

export function GroveCard({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useTheme();
  const { title, pill, caption, earned, next } = cardCopy(count);

  // The last three planted, then the next one ghosted, scaled together so their
  // relative heights stay true to the ladder.
  const row = earned.slice(-3);
  const shown = next ? [...row, next] : row;
  const tallest = shown.reduce((m, t) => Math.max(m, t.height), 1);
  const k = ROW_H / tallest;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Your grove"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={styles.row}>
        {shown.map((t, i) => {
          const isNext = !!next && i === shown.length - 1;
          const h = Math.max(26, Math.round(t.height * k));
          return (
            <Image
              key={t.id}
              source={TREE_SOURCES[t.id]}
              tintColor={colors.accent}
              resizeMode="contain"
              accessibilityLabel={`${t.name}${isNext ? ', not planted yet' : ', planted'}`}
              style={{
                width: Math.round(h * t.ratio),
                height: h,
                opacity: isNext ? 0.24 : 1,
                marginRight: isNext ? 0 : 12,
                marginLeft: isNext ? 4 : 0,
              }}
            />
          );
        })}
      </View>

      <View style={styles.foot}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <Text variant="chip" color={colors.bg}>{pill}</Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.muted }]}>{caption}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 15, marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: ROW_H },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  title: { flex: 1, fontFamily: fonts.serif, fontSize: 17 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  caption: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, marginTop: 7 },
});
