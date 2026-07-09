import { View } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

// Design: 6px track (line-2) + accent fill, radius 4.
export function ProgressBar({ progress, height = 6 }: { progress: number; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={{ height, borderRadius: 4, backgroundColor: colors.line2, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 4 }} />
    </View>
  );
}
