import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dashed';
  title: string;
  loading?: boolean;
}

export function Button({ variant = 'primary', title, loading, style, disabled, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDashed = variant === 'dashed';

  const backgroundColor = isPrimary ? colors.accent : isSecondary ? colors.surface : 'transparent';
  const textColor = isPrimary ? colors.bg : colors.accent;
  const borderColor = isSecondary ? colors.line : isDashed ? colors.accent2 : 'transparent';
  const borderWidth = isSecondary ? 1 : isDashed ? 1.4 : 0;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderColor, borderWidth, borderStyle: isDashed ? 'dashed' : 'solid' },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text variant="cta" color={textColor}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});
