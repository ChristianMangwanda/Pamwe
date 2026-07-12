import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const H = ({ children }: { children: React.ReactNode }) => (
    <Text variant="label" color={colors.ink} style={styles.heading}>{children}</Text>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <Text variant="body" color={colors.ink2} style={styles.para}>{children}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>Privacy policy</Text>
        <Text variant="body" color={colors.muted} style={styles.updated}>Last updated July 9, 2026</Text>

        <Text variant="body" color={colors.ink} style={styles.para}>
          Pamwe is a private devotional space for you and your partner. This policy explains,
          plainly, what the app collects, where it goes, who can see it, and how to erase it.
          The short version: your reflections belong to the two of you, we don't sell or share
          your data, and there are no ads.
        </Text>

        <H>What Pamwe collects</H>
        <P>
          Account: your email address and, if you sign in with Apple or Google, the name and
          email those services share. Your display name and avatar initial.
        </P>
        <P>
          Content you create: written reflections, voice reflections (audio recordings),
          prayers and "I prayed" marks, verse highlights and notes, and any custom reading
          plans you build.
        </P>
        <P>
          Progress: your reading plan, current day, streak, and the timezone captured once
          when your couple was created (used to know when a day rolls over).
        </P>
        <P>
          Device: if you allow notifications, a push token and your notification preferences.
          We don't collect your location, contacts, or photos.
        </P>

        <H>Who can see your reflections</H>
        <P>
          Only you and your partner. No one else, ever. A reflection stays sealed until both
          of you have submitted for the same day; then it is revealed to both of you at once.
          This rule is enforced by the database itself (row-level security), not just by the
          app's screens. Voice recordings live in private storage governed by the same rule.
          Prayers, highlights, and notes are shared between the two of you only.
        </P>

        <H>Services Pamwe relies on</H>
        <P>
          Supabase stores your account, content, and voice recordings, encrypted in transit.
        </P>
        <P>
          Apple (and Google, if you use Google sign-in) handle sign-in; Apple and Expo deliver
          push notifications. Notification content is minimal, e.g. that your partner has
          reflected, never what they wrote.
        </P>
        <P>
          Anthropic powers "Ask Pamwe", the reading-plan builder. When you use it, the request
          you type (e.g. "a plan about patience") is sent to Anthropic's AI service to generate
          plan suggestions. Your reflections, prayers, and notes are never sent.
        </P>
        <P>
          Bible text is fetched from bible-api.com by chapter reference. The request contains
          only the passage being read, nothing about you.
        </P>
        <P>
          If crash reporting is enabled, technical crash data goes to Sentry to help fix bugs.
          It does not include the content of your reflections or prayers.
        </P>

        <H>What Pamwe does not do</H>
        <P>
          No ads. No selling of data. No sharing your content with third parties beyond the
          services above, which act only on our instructions. No analytics on what you write,
          record, or pray. No training AI models on your content.
        </P>

        <H>How long we keep it</H>
        <P>
          Your content is kept for as long as your account exists, so your shared history is
          always there for the two of you. Delete your account and it goes with you.
        </P>

        <H>Deleting your data</H>
        <P>
          You can delete your account any time in Settings → Delete account. This permanently
          removes your reflections, voice recordings, prayers, prayer marks, highlights, notes,
          and account details. Your partner is unpaired and keeps their own reflections and
          prayers. Deletion is not reversible.
        </P>

        <H>Children</H>
        <P>
          Pamwe is not directed at children under 13, and we don't knowingly collect their
          data. If you believe a child has created an account, contact us and we'll delete it.
        </P>

        <H>Changes to this policy</H>
        <P>
          If this policy changes in a way that matters, we'll update the date above and let
          you know in the app before the change takes effect.
        </P>

        <H>Contact</H>
        <P>
          Questions about your data: christianmangwanda@gmail.com
        </P>
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
  para: { lineHeight: 24, marginBottom: 10 },
});
