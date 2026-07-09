import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

const sources = {
  corner: require('../../../assets/images/flowers-corner.png'),
  divider: require('../../../assets/images/flowers-divider.png'),
} as const;

interface FloralProps {
  variant: keyof typeof sources;
  style?: StyleProp<ImageStyle>;
}

// Botanical line-art motifs from the design handoff. The prototype recolors them
// to rose in dark mode via a CSS filter; tintColor achieves the same on the
// knocked-out PNGs.
export function Floral({ variant, style }: FloralProps) {
  const { colors, mode } = useTheme();
  return (
    <Image
      source={sources[variant]}
      resizeMode="contain"
      style={[mode === 'dark' ? { tintColor: colors.accent2 } : null, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
