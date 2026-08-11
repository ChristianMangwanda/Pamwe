import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { haptics } from '../../../lib/haptics';
import { archiveSummary, leaveCouple } from '../../../lib/archive';

// Ending the partnership, in two steps, because it should take two.
//
// The handoff's instruction for the first one is "one fact before the button",
// and the fact is the archive: the fear that stops people leaving cleanly is
// that a hundred and fifty days of their own words go with it. So that is
// answered before anything else, with the real number rather than a promise.
export default function LeaveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, partner, refresh } = useCouple();
  const [step, setStep] = useState<1 | 2>(1);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const partnerName = partner?.display_name?.split(' ')[0] ?? 'your partner';

  useEffect(() => {
    if (!couple?.id) return;
    archiveSummary(couple.id).then((s) => setNotes(s.notes)).catch(() => {});
  }, [couple?.id]);

  const leave = async () => {
    setBusy(true);
    try {
      haptics.medium();
      await leaveCouple(note);
      await refresh();
      // The gate re-reads from scratch: with no couple, it decides where a
      // person who has just left belongs.
      router.replace('/');
    } catch (e: any) {
      setBusy(false);
      Alert.alert("Couldn't finish that", e?.message ?? 'Try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <BackLink label={step === 1 ? 'You' : 'Back'} onPress={() => (step === 1 ? router.back() : setStep(1))} />
        </View>

        {step === 1 ? (
          <>
            <View style={styles.body}>
              <SectionEyebrow>Sad to see you go</SectionEyebrow>
              <Text variant="h1" style={styles.title}>Ending the journey</Text>
              <Text italic color={colors.ink2} style={styles.blurb}>
                {notes === null
                  ? 'Everything you have written stays readable for you both, in an archive nobody can change.'
                  : `Your ${notes} ${notes === 1 ? 'reflection stays' : 'reflections stay'} readable for you both, in an archive nobody can change.`}
              </Text>
            </View>
            <View style={styles.footer}>
              <Button title="Continue" variant="secondary" onPress={() => { haptics.tap(); setStep(2); }} />
              <Button title="Go back" variant="ghost" onPress={() => router.back()} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.body}>
              <Text variant="h1" style={styles.title}>Leave the pair</Text>
              <View style={styles.noteBlock}>
                <Text variant="label" color={colors.muted}>
                  A note to {partnerName.toUpperCase()}, if you want
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
                  placeholder="She reads it once."
                  placeholderTextColor={colors.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                {/* Said plainly, because it is unusual and people should be able
                    to decide with it in mind. The database enforces it. */}
                <Text color={colors.muted} style={styles.hint}>
                  {partnerName} sees this once, and then it is gone.
                </Text>
              </View>
            </View>
            <View style={styles.footer}>
              <Button title="Leave" onPress={leave} loading={busy} />
              <Button title="Go back" variant="ghost" disabled={busy} onPress={() => setStep(1)} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  flex: { flex: 1 },
  header: { paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 4 },
  title: { textAlign: 'center' },
  blurb: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  noteBlock: { alignSelf: 'stretch', gap: 8, alignItems: 'center' },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 25,
  },
  hint: { fontSize: 12, textAlign: 'center' },
  footer: { paddingBottom: 12, gap: 8 },
});
