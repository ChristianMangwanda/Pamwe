import { Text } from './ui/Text';
import { useTheme } from '../providers/ThemeProvider';

export interface PamweWordmarkProps {
  size?: number;
  color?: string;
  italic?: boolean;
  capital?: boolean;
}

export function PamweWordmark({
  size = 32,
  color,
  italic = true,
  capital = false
}: PamweWordmarkProps) {
  const { colors } = useTheme();
  const text = capital ? 'Pamwe' : 'pamwe';

  return (
    <Text
      color={color ?? colors.accent}
      italic={italic}
      style={{
        fontSize: size,
        lineHeight: size,
        letterSpacing: size * 0.005,
      }}
    >
      {text}
    </Text>
  );
}
