import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Floral } from '../../components/ui/Floral';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';

// "I have an invite code" vs "Get started" is remembered across the auth gate so
// the funnel can send code-holders straight toward Join. See src/app/index.tsx.
export const ONB_INTENT_KEY = 'pamwe:onbIntent';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const go = async (intent: 'invite' | 'join') => {
    haptics.tap();
    await AsyncStorage.setItem(ONB_INTENT_KEY, intent);
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.hero}>
        <Floral variant="corner" style={styles.floralTop} />
        <Floral variant="corner" style={styles.floralBottom} />
        <Text style={[styles.eyebrow, { color: colors.accent2 }]}>Pamwe</Text>
        <Text style={[styles.h1, { color: colors.ink }]}>Closer to God. Closer to each other.</Text>
        <Text italic color={colors.ink2} style={styles.pron}>pah-mweh · "together" in Shona</Text>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Button title="Get started" onPress={() => go('invite')} />
        <TouchableOpacity onPress={() => go('join')} style={styles.link} accessibilityRole="button">
          <Text style={[styles.linkText, { color: colors.accent }]}>I have an invite code</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 42,
    textAlign: 'center',
  },
  floralTop: { position: 'absolute', top: 70, left: -30, width: 150, height: 150, opacity: 0.7 },
  floralBottom: { position: 'absolute', bottom: 20, right: -34, width: 130, height: 130, opacity: 0.55, transform: [{ scaleX: -1 }, { rotate: '8deg' }] },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 3.5, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.serifLight, fontSize: 46, lineHeight: 47, textAlign: 'center', marginTop: 16 },
  pron: { fontSize: 15, textAlign: 'center', marginTop: 16 },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12, gap: 12 },
  link: { alignItems: 'center', paddingVertical: 6 },
  linkText: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
});
