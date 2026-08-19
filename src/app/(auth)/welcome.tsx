import { View, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { PamweBloom } from '../../components/PamweBloom';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';

// "I have a code" vs starting fresh is remembered across the auth gate so the
// funnel can send code-holders straight toward Join. See src/app/index.tsx.
export const ONB_INTENT_KEY = 'pamwe:onbIntent';

// The published policy site (docs/privacy-policy.md, deployed by
// .github/workflows/pages.yml). Linked rather than pushed to the in-app screens,
// which live inside the tab shell and need a couple to mount.
const PRIVACY_URL = 'https://christianmangwanda.github.io/Pamwe/';

// The first screen, rebuilt to the onboarding handoff (August 2026). The mark
// carries it now, and there are three doors rather than one.
//
// "I have a code" being a real door and not a footnote is the point: the person
// arriving with a code is the INVITED partner, who has no account and did not
// choose to be here. Under "Get started" their path began by looking like
// somebody else's.
export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const go = async (intent: 'invite' | 'join', mode: 'signup' | 'login' = 'signup') => {
    haptics.tap();
    await AsyncStorage.setItem(ONB_INTENT_KEY, intent);
    router.push({ pathname: '/(auth)/sign-in', params: { mode } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.hero}>
        <PamweBloom style={styles.bloom} />
        <View style={styles.words}>
          <Text variant="hero" color={colors.ink} style={styles.title}>Welcome to Pamwe</Text>
          <Text color={colors.ink2} style={styles.tagline}>Drawing closer to God</Text>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button title="Sign up" onPress={() => go('invite', 'signup')} />
        <Button title="Log in" variant="secondary" onPress={() => go('invite', 'login')} />
        <Button title="I have a code" variant="ghost" onPress={() => go('join', 'signup')} />
        {/* The privacy policy holds these reflections on the couple's explicit
            consent. This is where it is asked for, so the claim is true. */}
        <Text style={[styles.consent, { color: colors.ink2 }]}>
          By continuing you agree to our{' '}
          <Text
            style={[styles.consent, styles.consentLink, { color: colors.accent }]}
            onPress={() => Linking.openURL(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Terms and Privacy Policy
          </Text>
          .
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 42 },
  bloom: { width: 236, height: 265 },
  words: { alignItems: 'center', gap: 8 },
  title: { textAlign: 'center' },
  tagline: { textAlign: 'center' },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12, gap: 8 },
  consent: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 12, marginTop: 4 },
  consentLink: { textDecorationLine: 'underline' },
});
