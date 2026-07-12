import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BackLink } from '../../components/ui/BackLink';
import { Floral } from '../../components/ui/Floral';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { updateDisplayName, getMyProfile } from '../../lib/account';
import { ONB_INTENT_KEY } from '../(auth)/welcome';

export default function NameScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill with any existing display name (skips the email-prefix default).
  useEffect(() => {
    getMyProfile().then((p) => {
      const existing = p?.display_name;
      if (existing && !existing.includes('@')) setName(existing);
    });
  }, []);

  const canContinue = name.trim().length > 0;

  const onContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      await updateDisplayName(name);
      const intent = await AsyncStorage.getItem(ONB_INTENT_KEY);
      router.replace(intent === 'join' ? '/(onboarding)/join' : '/(onboarding)/pair-choice');
    } catch (e: any) {
      Alert.alert("Couldn't save your name", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Floral variant="corner" style={styles.floral} />
          <BackLink onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.ink }]}>What should we{'\n'}call you?</Text>
          <Text italic color={colors.ink2} style={styles.subtitle}>Your partner will see this name.</Text>
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
            onSubmitEditing={onContinue}
          />
        </View>

        <View style={styles.footer}>
          <Button title="Continue" onPress={onContinue} disabled={!canContinue} loading={saving} />
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
