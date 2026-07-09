import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EyeSlash } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { profileInitial } from '../../../lib/couples';

export default function CoupleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();

  const myName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'You');
  const myInitial = myName[0]?.toUpperCase() ?? 'Y';
  const partnerName = partner?.display_name ?? 'your partner';
  const partnerInit = profileInitial(partner) ?? '?';
  const streak = couple?.streak_count ?? 0;
  const pairedAt = couple?.paired_at
    ? new Date(couple.paired_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h1" style={styles.title}>You & {partner?.display_name ?? 'partner'}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.avatars}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarInitial, { color: colors.bg }]}>{myInitial}</Text>
            </View>
            <View style={[styles.avatar, styles.avatarBack, { backgroundColor: colors.accent2, borderColor: colors.surface }]}>
              <Text style={[styles.avatarInitial, { color: colors.surface }]}>{partnerInit}</Text>
            </View>
          </View>
          <Text style={[styles.names, { color: colors.ink }]}>{myName} & {partnerName}</Text>
          <Text style={[styles.meta, { color: colors.ink2 }]}>
            {streak} day streak{pairedAt ? ` · together since ${pairedAt}` : ''}
          </Text>
        </View>

        <Floral variant="divider" style={styles.divider} />

        <View style={[styles.noteRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <EyeSlash size={18} color={colors.accent2} weight="regular" />
          <Text style={[styles.noteLabel, { color: colors.ink }]}>Reflections sealed until you both write</Text>
          <Text style={[styles.noteOn, { color: colors.muted }]}>On</Text>
        </View>
        <Text style={[styles.privacy, { color: colors.ink2 }]}>
          Reflections are visible only to you and {partnerName}. A reflection stays sealed until you've both
          written for that day — we never surface it early, to anyone.
        </Text>

        <TouchableOpacity onPress={() => router.push('/(tabs)/you/delete-account')} style={styles.unlink} accessibilityRole="button">
          <Text variant="cta" color={colors.accent2} style={styles.unlinkText}>Delete my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  title: { marginTop: 12 },
  card: { marginTop: 20, borderWidth: 1, borderRadius: 20, paddingVertical: 26, alignItems: 'center' },
  avatars: { flexDirection: 'row' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarBack: { marginLeft: -14, borderWidth: 2 },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 22 },
  names: { fontFamily: fonts.serif, fontSize: 20, marginTop: 14 },
  meta: { fontFamily: fonts.sans, fontSize: 13, marginTop: 4 },
  divider: { width: 140, height: 26, alignSelf: 'center', marginVertical: 22, opacity: 0.8 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15 },
  noteLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 15 },
  noteOn: { fontFamily: fonts.sansMedium, fontSize: 12 },
  privacy: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, marginTop: 12 },
  unlink: { marginTop: 28, alignItems: 'center', paddingVertical: 14 },
  unlinkText: { fontSize: 12, letterSpacing: 0.7 },
});
