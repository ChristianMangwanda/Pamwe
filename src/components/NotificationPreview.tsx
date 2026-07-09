import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { HandsPraying } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';

// Mock iOS lock-screen notification (always dark, like a real banner). Used in the
// prayer compose sheet ("Ammy will see") and later in recaps.
export function NotificationPreview({ line, subline, icon }: { line: string; subline: string; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.accent }]}>
        {icon ?? <HandsPraying size={20} color={colors.bg} weight="fill" />}
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.app}>Pamwe</Text>
          <Text style={styles.now}>now</Text>
        </View>
        <Text style={styles.line} numberOfLines={1}>{line}</Text>
        {!!subline && <Text style={styles.subline} numberOfLines={1}>{subline}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#000', borderRadius: 18, padding: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  app: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: '#F7F0E1' },
  now: { fontFamily: fonts.sans, fontSize: 10, color: '#8b8b8b' },
  line: { fontFamily: fonts.sans, fontSize: 12, color: '#D8C4A6', marginTop: 1 },
  subline: { fontFamily: fonts.sans, fontSize: 12, color: '#8b8b8b', marginTop: 2 },
});
