import { Text, TextProps } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

// Design spec: 600 10px Instrument Sans, letter-spacing .2em, uppercase, muted.
export function SectionEyebrow({ color, ...props }: Omit<TextProps, 'variant'>) {
  const { colors } = useTheme();
  return <Text variant="eyebrow" color={color ?? colors.muted} {...props} />;
}
