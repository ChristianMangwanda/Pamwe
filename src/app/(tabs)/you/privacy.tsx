import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Privacy policy</Text>
        <Text variant="body" color={colors.muted} style={styles.updated}>Last updated June 10, 2026</Text>

        <Text variant="body" color={colors.ink} style={styles.para}>
          Pamwe is a private devotional space for you and your partner. This policy explains
          what the app stores and who can see it.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>What Pamwe stores</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Your email address (used to sign you in), your written and voice reflections, prayers
          you add, your reading progress and streak, the timezone captured when your couple was
          created, and — if you allow notifications — a push token and your notification
          preferences. All of it is stored with Supabase, our database and storage provider,
          and encrypted in transit.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Who can see your reflections</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Only you and your partner. A reflection stays sealed until both of you have submitted
          for the same day — then both are revealed, to both of you. This rule is enforced by
          the database itself, not just the app. Voice recordings live in private storage and
          are only playable under the same rule. Nothing you write or record is ever public.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>What Pamwe does not do</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          No ads. No selling or sharing your data with third parties. No analytics tracking of
          what you write or pray. If crash reporting is enabled, technical crash data is sent
          to Sentry to help fix bugs — it does not include the content of your reflections or
          prayers.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Deleting your data</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          You can delete your account any time from Settings. This permanently removes your
          reflections, prayers, prayer marks, and account. Your partner keeps their own
          reflections and prayers, and is unpaired.
        </Text>

        <Text variant="label" color={colors.ink} style={styles.heading}>Contact</Text>
        <Text variant="body" color={colors.ink2} style={styles.para}>
          Questions about your data: christianmangwanda@gmail.com
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
