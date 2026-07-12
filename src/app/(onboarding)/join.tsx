import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BackLink } from '../../components/ui/BackLink';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { haptics } from '../../lib/haptics';
import { joinCouple } from '../../lib/couples';

export default function JoinScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refresh } = useCouple();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const cleaned = code.replace(/[^A-Za-z0-9]/g, '');
  const canConnect = cleaned.length === 6;

  const onConnect = async () => {
    if (!canConnect) return;
    setLoading(true);
    try {
      await joinCouple(cleaned);
      await refresh();
      haptics.success();
      router.replace('/(onboarding)/connected');
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Couldn't connect you", e.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <BackLink onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.ink }]}>Enter your code</Text>
          <Text italic color={colors.ink2} style={styles.subtitle}>Paste the code your partner shared with you.</Text>
        </View>

        <View style={styles.field}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
            placeholder="ABC123"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={onConnect}
          />
        </View>

        <View style={styles.footer}>
          <Button title="Connect" onPress={onConnect} disabled={!canConnect} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: GUTTER, paddingTop: 8 },
  title: { fontFamily: fonts.serifLight, fontSize: 32, lineHeight: 34, marginTop: 22 },
  subtitle: { fontSize: 15, marginTop: 10 },
  field: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 26 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    textAlign: 'center',
    fontFamily: fonts.serifSemiBold,
    fontSize: 26,
    letterSpacing: 6,
  },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12 },
});
