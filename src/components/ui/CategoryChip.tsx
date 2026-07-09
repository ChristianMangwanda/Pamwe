import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';
import { CATEGORY_LABEL, PrayerCategory } from '../../lib/prayers';

// Design: IS 600 8.5px uppercase, accent2 text, surface2 bg, lineAccent border, pill.
export function CategoryChip({ category, style }: { category: PrayerCategory; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }, style]}>
      <Text variant="chip" color={colors.accent2}>{CATEGORY_LABEL[category] ?? 'Other'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
});
