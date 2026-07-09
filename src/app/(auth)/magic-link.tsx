import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EnvelopeSimple } from 'phosphor-react-native';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';

export default function MagicLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
          <EnvelopeSimple size={40} color={colors.accent} weight="regular" />
        </View>
        <Text variant="h1" style={styles.title}>Check your email</Text>
        <Text italic color={colors.ink2} style={styles.subtitle}>
          We've sent you a magic link. Tap it to sign in, then come back here.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button title="Back to sign in" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  footer: { paddingBottom: 12 },
});
