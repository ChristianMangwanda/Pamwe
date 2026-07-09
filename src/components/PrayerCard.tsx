import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HandsPraying, PencilSimple, Trash, DotsThreeOutline } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { CategoryChip } from './ui/CategoryChip';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { PrayerCategory } from '../lib/prayers';

export interface Prayer {
  id: string;
  text: string;
  status: 'active' | 'answered';
  author_id: string;
  category: PrayerCategory;
  notify_partner?: boolean;
  created_at: string;
  answered_at: string | null;
  answer_note: string | null;
}

interface PrayerCardProps {
  prayer: Prayer;
  isMine: boolean;
  partnerName: string;
  prayedByMe: boolean;
  prayedByPartner: boolean;
  onPray: () => void;
  onCard: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

const OPEN_X = -140;

export function PrayerCard({
  prayer, isMine, partnerName, prayedByMe, prayedByPartner, onPray, onCard, onEdit, onDelete,
}: PrayerCardProps) {
  const { colors } = useTheme();
  const tx = useSharedValue(0);
  const start = useSharedValue(0);

  const close = () => { tx.value = withTiming(0, { duration: 160 }); };

  // Swipe-to-reveal is only for your own prayers (Edit/Delete beneath).
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

  const initial = (isMine ? 'You' : partnerName)[0]?.toUpperCase() ?? '?';
  const who = isMine ? 'You' : partnerName;

  // Directional prayed row: your own prayer shows the partner's status (read-only);
  // your partner's prayer shows your "I prayed today" toggle.
  const row = isMine
    ? prayedByPartner
      ? { label: `${partnerName} prayed today`, color: colors.accent, fill: true, tappable: false }
      : { label: `Waiting for ${partnerName}`, color: colors.muted, fill: false, tappable: false }
    : prayedByMe
      ? { label: 'You prayed today', color: colors.accent, fill: true, tappable: false }
      : { label: 'I prayed today', color: colors.accent2, fill: false, tappable: true };

  return (
    <View style={styles.wrap}>
      {isMine && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => { close(); onEdit(); }} style={[styles.action, { backgroundColor: '#C9B99B' }]} accessibilityLabel="Edit prayer">
            <PencilSimple size={18} color={colors.ink} weight="regular" />
            <Text variant="chip" color={colors.ink} style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { close(); onDelete(); }} style={[styles.action, { backgroundColor: colors.accent2 }]} accessibilityLabel="Delete prayer">
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
            <Text style={[styles.when, { color: colors.muted }]}>· {relativeTime(prayer.created_at)}</Text>
            <CategoryChip category={prayer.category} style={styles.chip} />
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={onCard}>
            <Text style={[styles.text, { color: colors.ink }]}>{prayer.text}</Text>
          </TouchableOpacity>

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <TouchableOpacity
              disabled={!row.tappable}
              onPress={onPray}
              activeOpacity={0.7}
              style={styles.prayedRow}
              accessibilityRole={row.tappable ? 'button' : undefined}
            >
              <HandsPraying size={17} color={row.color} weight={row.fill ? 'fill' : 'regular'} />
              <Text style={[styles.prayedLabel, { color: row.color }]}>{row.label}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCard} hitSlop={10} accessibilityLabel="Prayer options">
              <DotsThreeOutline size={16} color="#B7A88C" weight="regular" />
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
  chip: { marginLeft: 'auto' },
  text: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 12 },
  footer: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prayedLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
});
