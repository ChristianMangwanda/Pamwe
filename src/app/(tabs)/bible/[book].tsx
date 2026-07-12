import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { findBook } from '../../../lib/bible';
import { haptics } from '../../../lib/haptics';

export default function ChapterPicker() {
  const router = useRouter();
  const { colors } = useTheme();
  const { book: rawBook } = useLocalSearchParams<{ book: string }>();
  const bookName = decodeURIComponent(rawBook ?? '');
  const book = findBook(bookName);

  if (!book) {
    return (
      <Screen>
        <BackLink onPress={() => router.replace('/(tabs)/bible')} label="Bible" />
        <Text variant="h2" style={{ marginTop: 22 }}>Unknown book</Text>
        <Text color={colors.ink2} style={{ marginTop: 8 }}>We couldn't find a book called "{bookName}".</Text>
        <Button title="Back to books" variant="secondary" onPress={() => router.replace('/(tabs)/bible')} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

  return (
    <Screen>
      <BackLink onPress={() => router.back()} label="Books" />
      <Text variant="h1" style={styles.title}>{book.name}</Text>
      <Text italic color={colors.ink2} style={styles.subtitle}>Pick a chapter.</Text>

      <View style={styles.grid}>
        {chapters.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => { haptics.tap(); router.push(`/(tabs)/bible/${encodeURIComponent(book.name)}/${n}` as any); }}
            activeOpacity={0.7}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Text style={[styles.chipText, { color: colors.ink }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  chip: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.serif, fontSize: 18 },
});
