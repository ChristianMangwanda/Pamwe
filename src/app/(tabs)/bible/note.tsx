import { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { saveNote, deleteNote } from '../../../lib/verseMarks';
import { haptics } from '../../../lib/haptics';

export default function NoteEditor() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { couple } = useCouple();
  const params = useLocalSearchParams<{ book: string; chapter: string; verse: string; text?: string }>();
  const book = params.book ?? '';
  const chapter = Number(params.chapter ?? 0);
  const verse = Number(params.verse ?? 0);
  const [text, setText] = useState(params.text ?? '');
  const [saving, setSaving] = useState(false);

  const ref = `${book} ${chapter}:${verse}`;
  const hadNote = !!params.text?.trim();
  const willDelete = hadNote && !text.trim();

  const onSave = async () => {
    if (!couple?.id) return;
    setSaving(true);
    try {
      const trimmed = text.trim();
      if (trimmed) await saveNote(couple.id, book, chapter, verse, trimmed);
      else await deleteNote(couple.id, book, chapter, verse);
      haptics.tap();
      router.back();
    } catch (e: any) {
      setSaving(false);
      Alert.alert("Couldn't save your note", e.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text color={colors.accent2} style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.ref, { color: colors.muted }]}>{ref}</Text>
          {/* Balances the row so the reference stays centred. */}
          <View style={styles.cancelSpacer} />
        </View>

        {/* The input grows into this box; Save sits outside it, so the keyboard
            can shrink the box without ever pushing the button off screen. */}
        <View style={styles.body}>
          <SectionEyebrow>Note on this verse</SectionEyebrow>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
            placeholder="What is this stirring in you?"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <Button
            title={willDelete ? 'Remove note' : 'Save note'}
            variant={willDelete ? 'secondary' : 'primary'}
            onPress={onSave}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 8 },
  cancel: { fontFamily: fonts.sansSemiBold, fontSize: 12, width: 54 },
  cancelSpacer: { width: 54 },
  ref: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  body: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 20 },
  input: { flex: 1, marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 18, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12 },
});
