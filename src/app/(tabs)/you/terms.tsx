import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';

export default function TermsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Terms of use</Text>
        <Text variant="body" color={colors.muted} style={styles.updated}>Last updated June 10, 2026</Text>

        <Text variant="body" color={colors.ink} style={styles.para}>By using Pamwe you agree to these terms.</Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Your content</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Your reflections and prayers are yours. You grant Pamwe only what it needs to store
          them and show them to you and your partner under the app's reveal rules — nothing
          more. Scripture text is from the World English Bible, which is in the public domain.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Acceptable use</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Pamwe is for personal use between you and your partner. Don't attempt to access
          another couple's data, disrupt the service, or use the app for anything unlawful.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Availability</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Pamwe is provided as-is, without warranty. Features may change, and the service may
          be interrupted or discontinued. We will always aim to give you a way to keep what
          you've written.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Ending your use</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          You can stop using Pamwe and delete your account at any time from Settings. Accounts
          that violate these terms may be removed.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Contact</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Questions about these terms: christianmangwanda@gmail.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  title: { marginTop: 14 },
  updated: { marginTop: 8, marginBottom: 12 },
  heading: { marginTop: 20, marginBottom: 8 },
  para: { lineHeight: 24 },
});
