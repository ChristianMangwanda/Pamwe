import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './ui/Text';
import { Floral } from './ui/Floral';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';

// What Today becomes once the day's reading is done and the next one has not
// come round yet.
//
// The whole point is that it stops asking for anything. A screen that offers
// "Read Day N+1" the second you finish turns a ritual into a queue, and a
// couple who cleared four days on a Sunday has nothing left to do together on
// Monday. So there is no primary action here at all: the verse you read is
// held, the next day is named with when it opens, and the two doors out go to
// parts of the app that are not the plan.
export function DayClosed({
  day, verse, verseRef, opens, streakCount, onPrayers, onGrove, onReread,
}: {
  /** The day just finished, not the one waiting. */
  day: number;
  verse: string;
  verseRef: string;
  /** How the wait reads: "tomorrow morning", "on Thursday". */
  opens: string;
  streakCount: number;
  onPrayers: () => void;
  onGrove: () => void;
  /** Back into the reveal, to read what you both wrote again. */
  onReread?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="eyebrow" color={colors.muted}>Well done</Text>
        <Text style={[styles.headline, { color: colors.ink }]}>
          You read Day {day} together.
        </Text>
        {streakCount > 0 && (
          <Text style={[styles.streak, { color: colors.ink2 }]}>
            {streakCount === 1
              ? 'One day at a time, towards building a habit.'
              : `${streakCount} days kept, this one among them.`}
          </Text>
        )}
      </View>

      <View style={[styles.verseCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.quoteGlyph, { color: colors.accent }]}>“</Text>
        <Text style={[styles.verse, { color: colors.ink }]}>{verse}</Text>
        <Floral variant="divider" style={styles.verseDivider} />
        <Text style={[styles.verseRef, { color: colors.ink2 }]}>{verseRef}</Text>
      </View>

      {/* Named, so the wait is a rhythm rather than a locked door. */}
      <Text style={[styles.next, { color: colors.muted }]}>
        Day {day + 1} opens {opens}.
      </Text>

      <Floral variant="divider" style={styles.divider} />

      <View style={styles.doors}>
        {onReread && <Door label="Read what you both wrote" onPress={onReread} />}
        <Door label="Pray together" onPress={onPrayers} />
        <Door label="See your grove" onPress={onGrove} />
      </View>
    </View>
  );
}

function Door({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => { haptics.tap(); onPress(); }}
      accessibilityRole="button"
      style={[styles.door, { borderTopColor: colors.line }]}
    >
      <Text style={[styles.doorLabel, { color: colors.ink }]}>{label}</Text>
      <Text style={[styles.doorMark, { color: colors.accent2 }]}>·</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  head: { alignItems: 'center', marginBottom: 22 },
  headline: { fontFamily: fonts.serifLight, fontSize: 28, textAlign: 'center', marginTop: 10 },
  streak: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 10, paddingHorizontal: 12 },

  verseCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20, alignItems: 'center' },
  quoteGlyph: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 52 },
  verse: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 30, textAlign: 'center' },
  verseDivider: { width: 120, height: 22, marginTop: 14, opacity: 0.85 },
  verseRef: { fontFamily: fonts.sans, fontSize: 12, marginTop: 10 },

  next: { fontFamily: fonts.sans, fontSize: 12.5, textAlign: 'center', marginTop: 18 },
  divider: { width: 150, height: 26, alignSelf: 'center', marginVertical: 10, opacity: 0.7 },

  doors: { marginTop: 4 },
  door: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth },
  doorLabel: { flex: 1, fontFamily: fonts.serif, fontSize: 16 },
  doorMark: { fontFamily: fonts.sans, fontSize: 16 },
});
