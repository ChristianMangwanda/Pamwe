import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { BottomSheet } from './ui/BottomSheet';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';

// Marking a prayer answered used to be Alert.prompt on iOS and a plain
// Alert.alert on Android, because Alert.prompt is iOS only. So the note about
// HOW it was answered, which is the whole point of the answered timeline, could
// not be written on Android at all: the button was there, it just silently
// saved nothing. This is the same question asked the same way on both.
export function AnsweredSheet({
  visible,
  prayerText,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  prayerText?: string;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
}) {
  const { colors } = useTheme();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Each opening starts clean, so a note abandoned on one prayer cannot appear
  // under the next.
  useEffect(() => {
    if (visible) { setNote(''); setSaving(false); }
  }, [visible]);

  const confirm = () => {
    setSaving(true);
    onConfirm(note.trim() || undefined);
  };

  return (
    <BottomSheet visible={visible} onClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text variant="h2" style={styles.title}>Answered</Text>
        {!!prayerText && (
          <Text italic color={colors.ink2} style={styles.prayer} numberOfLines={2}>
            “{prayerText}”
          </Text>
        )}
        <Text color={colors.ink2} style={styles.hint}>
          How was it answered? This is optional, and it is what the timeline remembers.
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
          value={note}
          onChangeText={setNote}
          placeholder="She got the job."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={280}
          textAlignVertical="top"
          accessibilityLabel="A note about how this prayer was answered"
        />

        <Button title="Mark answered" onPress={confirm} loading={saving} />
        <Button title="Not yet" variant="secondary" onPress={onCancel} style={styles.cancel} />
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 6 },
  prayer: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  hint: { fontSize: 13.5, lineHeight: 20, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  cancel: { marginTop: 8 },
});
