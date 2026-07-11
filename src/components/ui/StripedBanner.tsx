import { ReactNode, useId, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';

interface StripedBannerProps {
  height: number;
  radius?: number;
  /** Half-period of the stripe in px (design: 6–7). line2 band + bg band each `stripe` wide. */
  stripe?: number;
  /** Optional stripe color for per-plan variation. Defaults to the subtle line2. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// The prototype's plan banner: repeating-linear-gradient(45deg, line2 0 Npx, bg Npx 2Npx).
// RN has no repeating gradient, so it's an SVG userSpace pattern rotated 45°, sized to
// the measured width. `children` render on top (e.g. the italic plan title). An optional
// `tint` gives each plan its own soft stripe color.
export function StripedBanner({ height, radius = 0, stripe = 6, tint, style, children }: StripedBannerProps) {
  const { colors } = useTheme();
  const stripeColor = tint ?? colors.line2;
  const [width, setWidth] = useState(0);
  const rawId = useId();
  const patternId = `stripe-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const period = stripe * 2;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: colors.bg }, style]}
    >
      {width > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern
              id={patternId}
              width={period}
              height={period}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <Rect x={0} y={0} width={stripe} height={period} fill={stripeColor} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
