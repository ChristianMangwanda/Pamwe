import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Text';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';
import { haptics } from '../../lib/haptics';

export interface Segment<T extends string> {
  key: T;
  label: string;
}

// Pill segmented control (design: line-2 track, active = accent bg, bg-colored label).
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  style,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.line2 }, style]}>
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => { haptics.tap(); onChange(s.key); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: colors.accent }]}
          >
            <Text style={styles.label} color={active ? colors.bg : colors.ink2}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 999, padding: 3, gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.4 },
});
