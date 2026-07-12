import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PaperPlaneTilt, Key, CaretRight } from 'phosphor-react-native';
import { Text } from '../../components/ui/Text';
import { BackLink } from '../../components/ui/BackLink';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';

export default function PairChoiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const choose = (dest: '/(onboarding)/invite' | '/(onboarding)/join') => {
    haptics.tap();
    router.push(dest);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.ink }]}>Link with your partner</Text>
        <Text italic color={colors.ink2} style={styles.subtitle}>
          Pamwe is meant for two. Once you're linked, everything you read and pray is shared.
        </Text>
      </View>

      <View style={styles.options}>
        <Option
          Icon={PaperPlaneTilt}
          iconBg={colors.accent}
          iconColor={colors.bg}
          iconBorder={colors.accent}
          title="Invite your partner"
          sub="Send them a code to join you"
          onPress={() => choose('/(onboarding)/invite')}
        />
        <Option
          Icon={Key}
          iconBg={colors.surface2}
          iconColor={colors.accent}
          iconBorder={colors.lineAccent}
          title="I have a code"
          sub="Enter the code your partner sent"
          onPress={() => choose('/(onboarding)/join')}
        />
      </View>
    </SafeAreaView>
  );
}

function Option({ Icon, iconBg, iconColor, iconBorder, title, sub, onPress }: {
  Icon: React.ComponentType<{ size: number; color: string; weight?: any }>;
  iconBg: string; iconColor: string; iconBorder: string; title: string; sub: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        <Icon size={23} color={iconColor} weight="regular" />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.ink }]}>{title}</Text>
        <Text color={colors.muted} style={styles.optionSub}>{sub}</Text>
      </View>
      <CaretRight size={16} color={colors.accent2} weight="bold" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  title: { fontFamily: fonts.serifLight, fontSize: 32, lineHeight: 34, marginTop: 22 },
  subtitle: { fontSize: 15, lineHeight: 22.5, marginTop: 10 },
  options: { flex: 1, paddingTop: 28, gap: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderWidth: 1.4,
    borderRadius: 18,
    padding: 20,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: fonts.serifMedium, fontSize: 17 },
  optionSub: { fontSize: 12, marginTop: 2 },
});
