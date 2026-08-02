import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';

// Kept in step with docs/privacy-policy.md, which is the published version at
// the App Store listing's privacy URL. Apple reads both, and a contradiction
// between them is a rejection. If you edit one, edit the other.
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
        <Text variant="body" color={colors.muted} style={styles.updated}>Last updated August 2, 2026</Text>

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
          Content you create: written reflections, voice reflections and their transcripts,
          replies and kept lines you leave on your partner's reflection, prayers and "I prayed"
          marks, dreams, verse highlights and verse notes, and any reading plans you build.
        </P>
        <P>
          Progress: your reading plan, current day, streak, your anniversary if you set one,
          and the timezone captured once when your couple was created (used to know when a day
          rolls over).
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
        </P>
        <P>
          Prayers, dreams, highlights and verse notes are shared between the two of you the
          moment you save them. They are not held back until anything unlocks.
        </P>

        <H>Notifications can show what your partner wrote</H>
        <P>
          Some notifications include the words your partner wrote: a new prayer shows the start
          of the prayer, a reply to your reflection shows the start of the reply, and a verse
          note shows their name and the verse. These can appear on your lock screen, where
          anyone holding your phone could read them.
        </P>
        <P>
          The two reflection notifications never quote anything. They only tell you your partner
          has written, or that both of you are ready. You can turn any notification off in
          Settings.
        </P>

        <H>Plans you share or make public</H>
        <P>
          A plan you build starts private to the two of you. Sharing it creates a link, and
          anyone with that link can open it. Making it public is a separate step that lists it
          in Browse for every Pamwe user. Neither happens on its own. Your reflections, prayers,
          dreams and notes are never part of a shared plan.
        </P>

        <H>Religious content</H>
        <P>
          Almost everything you write here reveals your religious beliefs, and prayers and dreams
          often carry more: illness, family, money, grief. Under UK and EU rules this is a special
          category of data with extra protection. We hold it because you gave explicit consent,
          and you can withdraw that by deleting your account. We never use it to profile you or
          to train AI models.
        </P>

        <H>Services Pamwe relies on</H>
        <P>
          Supabase stores your account, content, and voice recordings, in the United States,
          encrypted in transit and at rest.
        </P>
        <P>
          Apple (and Google, if you use Google sign-in) handle sign-in. Apple and Expo deliver
          push notifications, including the ones that quote text.
        </P>
        <P>
          OpenAI builds a plan when you ask for one in Plans search. Anthropic suggests plans in
          the by-book builder. Only the words you type are sent. Your reflections, prayers,
          dreams and notes never are, and neither service may train on them.
        </P>
        <P>
          Bible text is fetched from bible-api.com and bible.helloao.org by passage reference.
          The request contains nothing about you.
        </P>
        <P>
          Crash reports go to Sentry to help fix bugs. They carry no reflections, prayers,
          dreams or notes, and are not linked to your account.
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
          You can delete your account any time in Settings, then Delete account. This permanently
          removes your reflections, voice recordings and transcripts, prayers, prayer marks,
          dreams, highlights, verse notes, replies, and account details. Your partner is unpaired
          and keeps everything they wrote. A plan the two of you built stays with them, without
          your name on it. Deletion is not reversible.
        </P>

        <H>Children</H>
        <P>
          You must be at least 13 to use Pamwe, and we don't knowingly collect data from anyone
          under 13. If you believe a child has created an account, contact us and we'll delete it.
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
