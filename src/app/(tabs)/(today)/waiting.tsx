import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { popIn } from '../../../lib/motion';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { useCouple } from '../../../providers/CoupleProvider';
import { supabase } from '../../../lib/supabase';
import { profileInitial } from '../../../lib/couples';

const FALLBACK_POLL_MS = 30000;

export default function WaitingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couplePlan, partner } = useCouple();
  const { partnerEntry, refresh, error } = useTodayEntry();
  const partnerName = partner?.display_name ?? 'Your partner';
  const partnerInitial = profileInitial(partner) ?? '?';

  useEffect(() => {
    if (!couplePlan) return;
    const channel = supabase
      .channel('partner-entry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `couple_plan_id=eq.${couplePlan.id}` }, () => { refresh(); })
      .subscribe();
    const fallback = setInterval(refresh, FALLBACK_POLL_MS);
    return () => { supabase.removeChannel(channel); clearInterval(fallback); };
  }, [couplePlan?.id, refresh]);

  useEffect(() => {
    if (partnerEntry?.submitted_at) router.replace('/(tabs)/(today)/reveal');
  }, [partnerEntry?.submitted_at]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View entering={popIn} style={[styles.check, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
          <Check size={32} color={colors.accent} weight="bold" />
        </Animated.View>
        <Text style={[styles.title, { color: colors.ink }]}>Yours is in.</Text>
        <Text color={colors.ink2} style={styles.body}>
          It stays sealed until {partnerName} has written too. The moment you both have, we'll tell you. Some things are worth the wait.
        </Text>

        <View style={[styles.partnerCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.avatar, { borderColor: colors.accent2 }]}>
            <Text style={[styles.avatarInitial, { color: colors.accent }]}>{partnerInitial}</Text>
          </View>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}>{partnerName} is reading…</Text>
        </View>

        {error && (
          <Text color={colors.muted} style={styles.errorHint}>We can't reach the server right now. We'll keep trying.</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button title="Back to Today" onPress={() => router.replace('/(tabs)/(today)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  check: { width: 74, height: 74, borderRadius: 37, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serifLight, fontSize: 28, lineHeight: 32, marginTop: 22, textAlign: 'center' },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  partnerCard: { marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 16 },
  errorHint: { fontFamily: fonts.sans, fontSize: 12, textAlign: 'center', marginTop: 20 },
  footer: { paddingBottom: 12 },
});
