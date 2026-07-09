import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';

// Design custom switch: 44×26 track, 20px knob. On = accent, off = beige (#C9B99B).
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { haptics.light(); onValueChange(!value); }}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: value ? colors.accent : '#C9B99B', justifyContent: value ? 'flex-end' : 'flex-start' }]}
    >
      <View style={[styles.knob, { backgroundColor: colors.surface }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 999, padding: 3, flexDirection: 'row', alignItems: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
