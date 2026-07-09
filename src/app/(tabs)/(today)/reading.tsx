import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { Floral } from '../../../components/ui/Floral';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { fetchPassage } from '../../../lib/bible';

export default function ReadingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { planDay, dayNumber } = useTodayEntry();

  // Curated plans ship seeded passage_text; custom (builder) plans store NULL and
  // live-fetch the passage from bible-api.com on the fly.
  const seededText: string | null = planDay?.passage_text ?? null;
  const reference: string | undefined = planDay?.passage_reference;
  const [fetchedText, setFetchedText] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const loadPassage = useCallback(async () => {
    if (seededText || !reference) return;
    setFetching(true);
    setFetchError(false);
    try {
      setFetchedText(await fetchPassage(reference));
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }, [seededText, reference]);

  useEffect(() => { loadPassage(); }, [loadPassage]);

  if (!planDay) return null;

  const passageText = seededText ?? fetchedText;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink onPress={() => router.back()} />

        <View style={styles.header}>
          <SectionEyebrow>Day {dayNumber}</SectionEyebrow>
          <Text variant="h2" style={styles.title}>{planDay.passage_title ?? planDay.passage_reference}</Text>
          <Text color={colors.ink2} style={styles.reference}>{planDay.passage_reference}</Text>
        </View>

        <Floral variant="divider" style={styles.divider} />

        {passageText ? (
          <Text variant="reader" color={colors.ink} style={styles.passage}>{passageText}</Text>
        ) : fetching ? (
          <View style={styles.passageState}>
            <ActivityIndicator color={colors.accent} />
            <Text color={colors.ink2} style={styles.passageStateText}>Gathering the words…</Text>
          </View>
        ) : fetchError ? (
          <View style={styles.passageState}>
            <Text color={colors.ink2} style={styles.passageStateText}>We couldn't load this passage.</Text>
            <Button title="Try again" variant="secondary" onPress={loadPassage} />
          </View>
        ) : null}

        {planDay.reflection_prompt ? (
          <Card style={styles.promptCard} padding={20}>
            <SectionEyebrow style={styles.promptLabel}>Sit with this</SectionEyebrow>
            <Text variant="journal" italic color={colors.ink2} style={styles.promptText}>
              {planDay.reflection_prompt}
            </Text>
          </Card>
        ) : null}

        <Button title="Write your reflection" onPress={() => router.push('/(tabs)/(today)/journal')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 18 },
  title: { marginTop: 8, textAlign: 'center' },
  reference: { fontSize: 14, marginTop: 6 },
  divider: { width: 150, height: 26, alignSelf: 'center', marginVertical: 22, opacity: 0.92 },
  passage: { marginBottom: 26 },
  passageState: { alignItems: 'center', gap: 14, marginBottom: 26, paddingVertical: 20 },
  passageStateText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  promptCard: { marginBottom: 26 },
  promptLabel: { marginBottom: 10 },
  promptText: { lineHeight: 26 },
});
