import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { sheetUp } from '../../lib/motion';
import { useTheme } from '../../providers/ThemeProvider';

// Scrim + sheet: sheet slides up (sheetUp), scrim fades in. Radius 26 top corners.
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <AnimatedPressable style={styles.scrim} entering={FadeIn.duration(220)} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          entering={sheetUp}
          style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.line }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(23, 19, 15, 0.32)' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
});
