import { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Flower } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { fonts } from '../constants/typography';
import { popIn } from '../lib/motion';
import { haptics } from '../lib/haptics';
import { useTheme } from '../providers/ThemeProvider';
import { Milestone, MILESTONE_COPY } from '../lib/milestones';

// A quiet celebration on Today when the couple's streak reaches a milestone.
// Shows once per milestone (the caller gates via an AsyncStorage high-water
// mark) and dismisses with an Amen.
export function MilestoneCard({ milestone, onDismiss }: { milestone: Milestone; onDismiss: () => void }) {
  const { colors } = useTheme();
  const copy = MILESTONE_COPY[milestone];

  useEffect(() => {
    haptics.celebrate();
  }, []);

  return (
    <Animated.View entering={popIn} style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
      <View style={[styles.ring, { borderColor: colors.accent2 }]}>
        <Flower size={20} color={colors.accent} weight="fill" />
      </View>
      <Text style={[styles.title, { color: colors.accent }]}>{copy.title}</Text>
      <Text style={[styles.body, { color: colors.ink }]}>{copy.body}</Text>
      <TouchableOpacity onPress={onDismiss} activeOpacity={0.8} accessibilityRole="button"
        style={[styles.btn, { backgroundColor: colors.accent }]}>
        <Text variant="chip" color={colors.bg} style={styles.btnText}>Amen</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 22, paddingVertical: 20, marginTop: 18 },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serifMedium, fontSize: 18, marginTop: 12, textAlign: 'center' },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21.5, marginTop: 8, textAlign: 'center' },
  btn: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 9, marginTop: 14 },
  btnText: { fontSize: 11, letterSpacing: 1 },
});
