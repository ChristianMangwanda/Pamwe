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
        <Text variant="h2" style={styles.title}>Terms of service</Text>
        <Text variant="body" color={colors.muted} style={styles.updated}>Last updated July 9, 2026</Text>

        <Text variant="body" color={colors.ink} style={styles.para}>
          These terms are an agreement between you and Pamwe. By creating an account or using
          the app, you accept them. If you don't agree, please don't use Pamwe.
        </Text>

        <H>Who can use Pamwe</H>
        <P>
          You must be at least 13 years old (or the minimum age of digital consent where you
          live) and able to enter into this agreement. Pamwe is designed for two partners
          reading together; each account belongs to one person.
        </P>

        <H>Your content</H>
        <P>
          Everything you write, record, and mark in Pamwe is yours. You grant us only the
          limited license needed to store your content, back it up, and show it to you and
          your partner under the app's reveal rules — nothing more. We claim no ownership and
          will never publish, sell, or use your content to train AI models.
        </P>

        <H>Our content</H>
        <P>
          Scripture text is from the World English Bible and other public-domain translations.
          Reading plans, prompts, and the app's design are ours or our licensors'; you may use
          them within the app for personal, non-commercial purposes.
        </P>

        <H>Ask Pamwe (AI suggestions)</H>
        <P>
          The plan builder uses an AI service to suggest reading plans. Suggestions are
          generated automatically and may be imperfect — review a plan before beginning it.
          Scripture references in a generated plan should always be checked against the text
          itself.
        </P>

        <H>Not professional advice</H>
        <P>
          Pamwe is a devotional companion, not a substitute for pastoral care, counseling,
          therapy, or medical advice. If you or your partner are in crisis, please reach out
          to a qualified professional or an emergency service.
        </P>

        <H>Acceptable use</H>
        <P>
          Use Pamwe only for its purpose: a shared devotional practice between you and your
          partner. Don't attempt to access another couple's data, probe or disrupt the
          service, reverse-engineer the app, use it for anything unlawful, or upload content
          that is abusive or infringes someone else's rights.
        </P>

        <H>Your account</H>
        <P>
          Keep your sign-in method secure — it's the key to a space two people share. You're
          responsible for activity under your account. You can delete your account at any time
          in Settings; deletion is permanent and unpairs your partner, who keeps their own
          content.
        </P>

        <H>Availability and changes</H>
        <P>
          Pamwe is provided "as is" and "as available", without warranties of any kind.
          Features may change, and the service may be interrupted or discontinued. If Pamwe
          ever winds down, we will aim to give you notice and a way to keep what you've
          written.
        </P>

        <H>Limitation of liability</H>
        <P>
          To the fullest extent the law allows, Pamwe and its creator are not liable for
          indirect, incidental, or consequential damages arising from your use of the app —
          including lost data beyond what reasonable backups can restore. Nothing in these
          terms limits liability where the law does not permit it.
        </P>

        <H>Ending your use</H>
        <P>
          You can stop using Pamwe at any time. We may suspend or remove accounts that
          violate these terms or misuse the service, and we'll tell you why unless the law
          prevents it.
        </P>

        <H>Changes to these terms</H>
        <P>
          If these terms change materially, we'll update the date above and notify you in the
          app before the change takes effect. Continuing to use Pamwe after that means you
          accept the new terms.
        </P>

        <H>Contact</H>
        <P>
          Questions about these terms: christianmangwanda@gmail.com
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
