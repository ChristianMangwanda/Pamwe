import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { updateDisplayName } from '../../../lib/account';
import { haptics } from '../../../lib/haptics';

// Changing your name after onboarding had no door at all: updateDisplayName
// existed but the only screen that called it was (onboarding)/name, which
// routes onward into pairing. The name your partner sees was set once and then
// fixed for good.
export default function EditNameScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { me, refresh: refreshCouple } = useCouple();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed from the profile, skipping the email-prefix default the trigger
  // writes, so the field starts empty rather than pre-filled with an address.
  useEffect(() => {
    const existing = me?.display_name;
    if (existing && !existing.includes('@')) setName(existing);
  }, [me?.display_name]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== me?.display_name;

  const onSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      await refreshCouple();
      haptics.success();
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save your name", e?.message ?? 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Floral variant="corner" style={styles.floral} />
          <BackLink label="Settings" onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.ink }]}>Your name</Text>
          <Text italic color={colors.ink2} style={styles.subtitle}>
            This is the name your partner sees on your reflections.
          </Text>
        </View>

        <View style={styles.field}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
            placeholder="Your first name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onSave}
            accessibilityLabel="Your name"
          />
        </View>

        <View style={styles.footer}>
          <Button title="Save" onPress={onSave} disabled={!canSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: GUTTER, paddingTop: 8 },
  floral: { position: 'absolute', top: 30, right: -18, width: 96, height: 96, opacity: 0.6, transform: [{ scaleX: -1 }] },
  title: { fontFamily: fonts.serifLight, fontSize: 32, lineHeight: 34, marginTop: 22 },
  subtitle: { fontSize: 15, marginTop: 10 },
  field: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 26 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
    fontFamily: fonts.serif,
    fontSize: 20,
  },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12 },
});
