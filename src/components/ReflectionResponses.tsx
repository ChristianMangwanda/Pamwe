import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Heart, HandsPraying, ChatCircle, Trash } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import {
  EntryResponse, toggleReaction, addReply, deleteResponse,
} from '../lib/entryResponses';

// Renders the response layer for one reflection entry.
//  - canRespond (the partner's entry): heart / amen / reply controls, editable.
//  - otherwise (my own entry): the partner's responses to me, read only.
// Optimistic: local state leads, the server call follows. When the parent
// refetches (initial load landing, or a realtime event), it bumps `revision`
// and this component re-syncs to server truth; syncing on the `initial` array
// itself would loop, since parents rebuild it every render.
export function ReflectionResponses({
  entry, couplePlanId, dayNumber, canRespond, partnerName, initial, revision = 0,
}: {
  entry: { id: string };
  couplePlanId: string;
  dayNumber: number;
  canRespond: boolean;
  partnerName: string;
  initial: EntryResponse[];
  revision?: number;
}) {
  const { colors } = useTheme();
  const [responses, setResponses] = useState<EntryResponse[]>(initial);
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (revision > 0) setResponses(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const hearted = useMemo(() => responses.some((r) => r.kind === 'heart'), [responses]);
  const amened = useMemo(() => responses.some((r) => r.kind === 'amen'), [responses]);
  const written = useMemo(
    () => responses.filter((r) => r.kind === 'reply' || r.kind === 'quote'),
    [responses],
  );

  const onToggle = async (kind: 'heart' | 'amen') => {
    if (busy) return;
    haptics.light();
    const had = responses.some((r) => r.kind === kind);
    // optimistic
    setResponses((prev) => had ? prev.filter((r) => r.kind !== kind) : [...prev, {
      id: `tmp-${kind}`, entry_id: entry.id, author_id: 'me', kind, body: null, created_at: '',
    }]);
    try {
      await toggleReaction(entry.id, couplePlanId, dayNumber, kind);
    } catch {
      // revert
      setResponses((prev) => had
        ? [...prev, { id: `tmp-${kind}`, entry_id: entry.id, author_id: 'me', kind, body: null, created_at: '' }]
        : prev.filter((r) => r.kind !== kind));
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  const onSendReply = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    haptics.medium();
    try {
      const saved = await addReply(entry.id, couplePlanId, dayNumber, text);
      setResponses((prev) => [...prev, saved]);
      setDraft('');
      setReplyOpen(false);
    } catch {
      Alert.alert('Could not send', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (r: EntryResponse) => {
    Alert.alert('Remove this?', 'It will be removed for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setResponses((prev) => prev.filter((x) => x.id !== r.id));
          try { await deleteResponse(r.id); } catch { Alert.alert('Could not remove', 'Please try again.'); }
        },
      },
    ]);
  };

  // Read-only view of what the partner left on my entry.
  if (!canRespond) {
    if (responses.length === 0) return null;
    return (
      <View style={[styles.readonly, { borderTopColor: colors.line2 }]}>
        <View style={styles.badgeRow}>
          {hearted && <Heart size={15} color={colors.accent} weight="fill" />}
          {amened && <HandsPraying size={15} color={colors.accent} weight="fill" />}
          {(hearted || amened) && (
            <Text style={[styles.badgeText, { color: colors.muted }]}>{partnerName} responded</Text>
          )}
        </View>
        {written.map((r) => (
          <View key={r.id} style={[styles.theirReply, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
            <Text style={[styles.theirLabel, { color: colors.accent2 }]}>{partnerName}</Text>
            <Text style={[styles.replyText, { color: colors.ink }]}>{r.body}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderTopColor: colors.line2 }]}>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onToggle('heart')} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Heart" accessibilityState={{ selected: hearted }}
          style={[styles.action, { borderColor: hearted ? colors.accent : colors.line, backgroundColor: hearted ? colors.accent : 'transparent' }]}>
          <Heart size={15} color={hearted ? colors.bg : colors.accent2} weight={hearted ? 'fill' : 'regular'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle('amen')} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Amen" accessibilityState={{ selected: amened }}
          style={[styles.action, { borderColor: amened ? colors.accent : colors.line, backgroundColor: amened ? colors.accent : 'transparent' }]}>
          <HandsPraying size={15} color={amened ? colors.bg : colors.accent2} weight={amened ? 'fill' : 'regular'} />
          <Text style={[styles.actionText, { color: amened ? colors.bg : colors.accent2 }]}>Amen</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { haptics.tap(); setReplyOpen((o) => !o); }} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Reply"
          style={[styles.action, { borderColor: colors.line }]}>
          <ChatCircle size={15} color={colors.accent2} weight="regular" />
          <Text style={[styles.actionText, { color: colors.accent2 }]}>Reply</Text>
        </TouchableOpacity>
      </View>

      {replyOpen && (
        <View style={styles.replyBox}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Say something to ${partnerName}`}
            placeholderTextColor={colors.muted}
            style={[styles.replyInput, { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}
            multiline
            maxLength={280}
          />
          <TouchableOpacity onPress={onSendReply} disabled={!draft.trim() || busy} activeOpacity={0.85}
            style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: !draft.trim() || busy ? 0.5 : 1 }]}>
            <Text variant="chip" color={colors.bg} style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {written.map((r) => (
        <View key={r.id} style={[styles.myReply, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
          <Text style={[styles.replyText, { color: colors.ink }]}>{r.body}</Text>
          <TouchableOpacity onPress={() => onDelete(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove">
            <Trash size={14} color={colors.muted} weight="regular" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  actionText: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
  replyBox: { marginTop: 10, gap: 8 },
  replyInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: fonts.sans, fontSize: 14, minHeight: 44 },
  sendBtn: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  sendText: { fontSize: 11, letterSpacing: 0.8 },
  myReply: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  replyText: { flex: 1, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 },
  readonly: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.4 },
  theirReply: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  theirLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
});
