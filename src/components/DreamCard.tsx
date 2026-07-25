import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HandsPraying, PencilSimple, Trash } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { relativeTime } from './PrayerCard';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';

export interface Dream {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
}

interface DreamCardProps {
  dream: Dream;
  isMine: boolean;
  partnerName: string;
  onPray: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const OPEN_X = -140;
// Dreams run long in a way prayers don't, so the card keeps a readable height
// and opens the rest in place when tapped. No detail screen to maintain.
const CLAMP_LINES = 8;

export function DreamCard({ dream, isMine, partnerName, onPray, onEdit, onDelete }: DreamCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const tx = useSharedValue(0);
  const start = useSharedValue(0);

  const close = () => { tx.value = withTiming(0, { duration: 160 }); };

  // Swipe-to-reveal is only for your own dreams (Edit/Delete beneath), same as
  // PrayerCard: your partner reads your dream, they never rewrite it.
  const pan = Gesture.Pan()
    .enabled(isMine)
    .activeOffsetX([-10, 10]) // let vertical scroll win until a clear horizontal drag
    .onStart(() => { start.value = tx.value; })
    .onUpdate((e) => {
      let v = start.value + e.translationX;
      if (v > 0) v = 0;
      if (v < -150) v = -150;
      tx.value = v;
    })
    .onEnd(() => {
      const open = tx.value < -70;
      tx.value = withTiming(open ? OPEN_X : 0, { duration: 180 });
      if (open) runOnJS(haptics.medium)();
    });

  const frontStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const who = isMine ? 'You' : partnerName;
  const initial = who[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.wrap}>
      {isMine && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => { close(); onEdit(); }} style={[styles.action, { backgroundColor: '#C9B99B' }]} accessibilityLabel="Edit dream">
            <PencilSimple size={18} color={colors.ink} weight="regular" />
            <Text variant="chip" color={colors.ink} style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { close(); onDelete(); }} style={[styles.action, { backgroundColor: colors.accent2 }]} accessibilityLabel="Delete dream">
            <Trash size={18} color={colors.bg} weight="regular" />
            <Text variant="chip" color={colors.bg} style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, frontStyle]}>
          <View style={styles.headerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accent2 }]}>
              <Text style={[styles.avatarInitial, { color: colors.surface }]}>{initial}</Text>
            </View>
            <Text style={[styles.who, { color: colors.ink }]}>{who}</Text>
            <Text style={[styles.when, { color: colors.muted }]}>· {relativeTime(dream.created_at)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { haptics.tap(); setExpanded((v) => !v); }}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse dream' : 'Read the whole dream'}
          >
            <Text
              style={[styles.text, { color: colors.ink }]}
              numberOfLines={expanded ? undefined : CLAMP_LINES}
            >
              {dream.text}
            </Text>
          </TouchableOpacity>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <TouchableOpacity onPress={onPray} activeOpacity={0.7} style={styles.prayRow} accessibilityRole="button">
              <HandsPraying size={17} color={colors.accent2} weight="regular" />
              <Text style={[styles.prayLabel, { color: colors.accent2 }]}>Pray about this</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  actions: { position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' },
  action: { width: 70, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionLabel: { fontSize: 9, letterSpacing: 0.6 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serifMedium, fontSize: 11 },
  who: { fontFamily: fonts.sansMedium, fontSize: 11 },
  when: { fontFamily: fonts.sans, fontSize: 10 },
  text: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 12 },
  footer: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prayLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
});
