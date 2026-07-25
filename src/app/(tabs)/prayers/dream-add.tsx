import { useState } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { createDream, updateDream } from '../../../lib/dreams';
import { haptics } from '../../../lib/haptics';

// Matches the char_length check on public.dreams.
const MAX_LENGTH = 4000;

export default function AddDreamScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, partner } = useCouple();
  const params = useLocalSearchParams<{ editId?: string; text?: string }>();

  // Edit reuses this screen through params, same as the prayer add screen.
  const isEdit = !!params.editId;
  const [text, setText] = useState(params.text ?? '');
  const [saving, setSaving] = useState(false);

  const partnerName = partner?.display_name ?? 'your partner';

  const handleSave = async () => {
    if (!couple || !text.trim()) return;
    try {
      setSaving(true);
      haptics.medium();
      if (isEdit && params.editId) {
        await updateDream(params.editId, text);
      } else {
        await createDream(couple.id, text);
      }
      router.back();
    } catch (err: any) {
      Alert.alert("Couldn't save your dream", err?.message ?? 'Try again in a moment.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackLink label="Dreams" onPress={() => router.back()} />
          <Text variant="h1" style={styles.title}>{isEdit ? 'Edit dream' : 'New dream'}</Text>
          <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
            Write it down while it's still close.
          </Text>

          <SectionEyebrow style={styles.eyebrow}>What you saw</SectionEyebrow>
          <View style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <TextInput
              style={[styles.textInput, { color: colors.ink }]}
              multiline autoFocus={!isEdit} maxLength={MAX_LENGTH}
              placeholder="e.g. I was standing at the edge of a river I couldn't cross…"
              placeholderTextColor={colors.muted}
              value={text} onChangeText={setText} textAlignVertical="top"
            />
          </View>
          <Text style={[styles.count, { color: colors.muted }]}>{text.length} / {MAX_LENGTH}</Text>

          <Text style={[styles.note, { color: colors.muted }]}>
            {partnerName} can read this once you save it. Pamwe keeps the record, it doesn't tell you what it means.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isEdit ? 'Save changes' : 'Save dream'}
            onPress={handleSave}
            loading={saving}
            disabled={!text.trim() || saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  eyebrow: { marginTop: 22 },
  textBox: { borderWidth: 1, borderRadius: 16, padding: 15, marginTop: 10 },
  textInput: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, minHeight: 200, padding: 0 },
  count: { fontFamily: fonts.sans, fontSize: 11, textAlign: 'right', marginTop: 8 },
  note: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, marginTop: 18 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 12 },
});
