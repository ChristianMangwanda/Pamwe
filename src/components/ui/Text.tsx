import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { typeScale, fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: keyof typeof typeScale;
  color?: string;
  italic?: boolean;
}

export function Text({ variant = 'body', color, italic, style, ...props }: TextProps) {
  const { colors } = useTheme();
  const baseStyle = typeScale[variant];

  let fontFamily = baseStyle.fontFamily;
  if (italic) {
    if (fontFamily === fonts.serif) fontFamily = fonts.serifItalic;
    if (fontFamily === fonts.serifLight) fontFamily = fonts.serifLightItalic;
    if (fontFamily === fonts.serifMedium) fontFamily = fonts.serifMediumItalic;
  }

  return (
    <RNText
      style={[
        baseStyle,
        { color: color ?? colors.ink, fontFamily },
        style,
      ]}
      {...props}
    />
  );
}
