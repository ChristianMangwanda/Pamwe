import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SectionEyebrow } from '../../components/ui/SectionEyebrow';
import { BackLink } from '../../components/ui/BackLink';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: 'pamwe://(auth)/magic-link' },
    });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else router.push('/(auth)/magic-link');
  };

  const handleDevSignIn = async (devEmail: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: devEmail, password: 'dev-password' });
    setLoading(false);
    if (error) Alert.alert('Dev sign-in failed', error.message);
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      // v16 resolves (not throws) on cancel — a dismissed picker is a no-op.
      if (result.type !== 'success') return;
      const idToken = result.data?.idToken;
      if (!idToken) throw new Error('No idToken received from Google.');
      setLoading(true);
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert('Google Sign In Error', e?.message || 'An error occurred.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        setLoading(true);
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
        if (error) throw error;
        setLoading(false);
      } else {
        throw new Error('No identityToken received from Apple.');
      }
    } catch (e: any) {
      setLoading(false);
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Sign In Error', e.message || 'An error occurred.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackLink onPress={() => router.back()} />
          <SectionEyebrow style={styles.eyebrow}>Welcome</SectionEyebrow>
          <Text variant="h1" style={styles.title}>Sign in</Text>
          <Text italic color={colors.ink2} style={styles.subtitle}>
            Sign in separately from your partner — you'll pair in the next step.
          </Text>

          <View style={styles.form}>
            <SectionEyebrow>Email address</SectionEyebrow>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button title="Continue with email" onPress={handleEmailSignIn} loading={loading} />
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
            <Text variant="eyebrow" color={colors.muted}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
          </View>

          <View style={styles.oauth}>
            <Button title="Continue with Google" variant="secondary" onPress={handleGoogleSignIn} disabled={loading} />
            {Platform.OS === 'ios' && (
              <Button title="Continue with Apple" variant="secondary" onPress={handleAppleSignIn} disabled={loading} />
            )}
          </View>

          {__DEV__ && (
            <View style={styles.dev}>
              <SectionEyebrow style={styles.devLabel}>Dev only</SectionEyebrow>
              <Button title="Sign in as Christian" variant="ghost" onPress={() => handleDevSignIn('alice@pamwe.dev')} disabled={loading} />
              <Button title="Sign in as Ammy" variant="ghost" onPress={() => handleDevSignIn('bob@pamwe.dev')} disabled={loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  eyebrow: { marginTop: 22 },
  title: { marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 10, marginBottom: 28 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 26 },
  dividerLine: { flex: 1, height: 1 },
  oauth: { gap: 12 },
  dev: { marginTop: 28, gap: 8 },
  devLabel: { textAlign: 'center', marginBottom: 4 },
});
