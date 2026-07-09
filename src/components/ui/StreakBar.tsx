import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

// Design: a 7-dot strip, each 6×22, done = accent, upcoming = line-2.
export function StreakBar({ count, max = 7 }: { count: number; max?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < count ? colors.accent : colors.line2 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 22, borderRadius: 3 },
});
