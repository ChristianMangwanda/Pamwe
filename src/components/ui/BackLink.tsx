import { TouchableOpacity, StyleSheet } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
import { Text } from './Text';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';

// Design back affordance: caret + label in accent-2, 600 12px Instrument Sans.
export function BackLink({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={12}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <CaretLeft size={15} color={colors.accent2} weight="bold" />
      <Text color={colors.accent2} style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
});
