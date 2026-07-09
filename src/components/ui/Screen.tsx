import { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { fadeUp } from '../../lib/motion';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';

interface ScreenProps extends Pick<ScrollViewProps, 'refreshControl' | 'keyboardShouldPersistTaps'> {
  children: ReactNode;
  /** Render inside a ScrollView (default) or a plain flex View. */
  scroll?: boolean;
  /** Play the design's fadeUp entrance (default true). */
  animated?: boolean;
}

// Tab-screen wrapper: bg, safe-area top, 26px gutter, and enough bottom padding
// to scroll clear of the floating glass tab bar. Design: content starts 8px below
// the status bar; scroll area bottom padding 118.
export function Screen({ children, scroll = true, animated = true, ...scrollProps }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const content = (
    <View style={styles.gutter}>{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 118 }}
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingTop: insets.top + 8, paddingBottom: 118 }]}>{content}</View>
  );

  if (!animated) {
    return <View style={[styles.flex, { backgroundColor: colors.bg }]}>{body}</View>;
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Animated.View entering={fadeUp} style={styles.flex}>
        {body}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gutter: { paddingHorizontal: GUTTER },
});
