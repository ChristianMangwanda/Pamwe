import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { SectionEyebrow } from '../../components/ui/SectionEyebrow';
import { BackLink } from '../../components/ui/BackLink';
import { PamweBloom } from '../../components/PamweBloom';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { supabase } from '../../lib/supabase';

// App Review accounts (guideline 2.1: reviewers need full access without a
// partner of their own). Emails on this domain sign in with a password instead
// of a magic link; the accounts are pre-paired on the hosted project by
// scripts/seed_review_accounts.sql. Invisible unless you type one.
const REVIEWER_DOMAIN = '@review.pamwe.app';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Email is a door, not the front door (see the render). Reviewers reach the
  // password field through it, so it must stay one tap away and never be
  // conditional on anything but this.
  const [showEmail, setShowEmail] = useState(false);

  const isReviewer = email.trim().toLowerCase().endsWith(REVIEWER_DOMAIN);
  // Which door on welcome was used. The screen is the same either way, since
  // "Continue with Apple" creates an account or signs into one without being
  // told which, but telling a returning partner they are signing UP is wrong.
  const title = mode === 'login' ? 'Log in' : 'Sign up';

  const handleEmailSignIn = async () => {
    if (!email.trim()) return;
    if (isReviewer) {
      if (!password) return;
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      setLoading(false);
      if (error) Alert.alert("Couldn't sign you in", error.message);
      else router.replace('/');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: 'pamwe://(auth)/magic-link' },
    });
    setLoading(false);
    if (error) Alert.alert("Couldn't send the email", error.message);
    else router.push('/(auth)/magic-link');
  };

  const handleDevSignIn = async (devEmail: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: devEmail, password: 'dev-password' });
    setLoading(false);
    if (error) Alert.alert('Dev sign-in failed', error.message);
    else router.replace('/');
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      // v16 resolves (not throws) on cancel — a dismissed picker is a no-op.
      if (result.type !== 'success') return;
      const idToken = result.data?.idToken;
      if (!idToken) throw new Error("Google didn't finish signing you in. Try again.");
      setLoading(true);
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
      setLoading(false);
      // Nothing watches auth state for navigation — route back through the
      // gate explicitly (the deep-link handler does the same for magic links).
      router.replace('/');
    } catch (e: any) {
      setLoading(false);
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert("Couldn't sign in with Google", e?.message || 'Something went wrong. Try again.');
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
        router.replace('/');
      } else {
        throw new Error("Apple didn't finish signing you in. Try again.");
      }
    } catch (e: any) {
      setLoading(false);
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert("Couldn't sign in with Apple", e.message || 'Something went wrong. Try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackLink onPress={() => router.back()} />

          {/* Providers first, email behind a door. The handoff's reason for that
              order is worth keeping in mind: whichever account you choose here
              is what your reflections are tied to, and an Apple or Google
              account is one you will still have when this phone is replaced.
              An email you stop reading takes your journal with it. */}
          <View style={styles.hero}>
            <PamweBloom motion="still" style={styles.bloom} />
            <Text variant="h1" style={styles.title}>{title}</Text>
            <Text italic color={colors.ink2} style={styles.subtitle}>
              Whichever you choose is how your reflections find you again on a new phone.
            </Text>
          </View>

          <View style={styles.oauth}>
            {Platform.OS === 'ios' && (
              <Button title="Continue with Apple" onPress={handleAppleSignIn} disabled={loading} />
            )}
            <Button title="Continue with Google" variant="secondary" onPress={handleGoogleSignIn} disabled={loading} />
            {!showEmail && (
              <Button title="Use an email address" variant="ghost" onPress={() => setShowEmail(true)} />
            )}
          </View>

          {showEmail && (
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
                autoFocus
              />
              {isReviewer && (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
              <Button title={isReviewer ? 'Sign in with password' : 'Continue with email'} onPress={handleEmailSignIn} loading={loading} />
            </View>
          )}

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
  hero: { alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 30 },
  bloom: { width: 104, height: 128 },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', paddingHorizontal: 8 },
  form: { gap: 12, marginTop: 26 },
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
