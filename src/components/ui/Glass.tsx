import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '../../providers/ThemeProvider';

interface GlassProps extends ViewProps {
  /** Corner radius; the design's glass surfaces use 28 (tab bar) and 26 (sheets). */
  radius?: number;
}

// Design spec: bg var(--glass), backdrop blur(22px) saturate(170%), 1px glass-border.
// iOS 26+ gets true liquid glass via expo-glass-effect; older systems get BlurView + glass tint.
export function Glass({ radius = 28, style, children, ...rest }: GlassProps) {
  const { colors, mode } = useTheme();
  const frame = {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden' as const,
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={mode} style={[frame, style]} {...rest}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={45} tint={mode === 'dark' ? 'dark' : 'light'} style={[frame, style]} {...rest}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
      {children}
    </BlurView>
  );
}
