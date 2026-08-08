import { useEffect, useMemo, useState, ReactNode } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Heart, HandsPraying, ChatCircle, Trash, BookmarkSimple } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import {
  EntryResponse, toggleReaction, addReply, saveQuote, deleteResponse,
} from '../lib/entryResponses';

// Split a reflection into keepable lines: sentences, trimmed, real ones only.
export function splitIntoLines(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

// A reply can answer a reply, as far down as the two of you keep going, so the
// indent has to stop somewhere or the words end up in a column two syllables
// wide. It stops at the fourth step: past that the chain reads by its labels.
const INDENT = 16;
const MAX_INDENT_STEPS = 3;

// Renders the response layer for one reflection entry.
//  - canRespond (the partner's entry): heart / amen / reply / keep a line.
//  - otherwise (my own entry): what they left me, and a Reply on each of it, so
//    answering their answer is possible on the reflection I wrote myself.
// Optimistic: local state leads, the server call follows. When the parent
// refetches (initial load landing, or a realtime event), it bumps `revision`
// and this component re-syncs to server truth; syncing on the `initial` array
// itself would loop, since parents rebuild it every render.
export function ReflectionResponses({
  entry, couplePlanId, dayNumber, canRespond, partnerName, myUserId, initial, revision = 0, entryText,
}: {
  entry: { id: string };
  couplePlanId: string;
  dayNumber: number;
  canRespond: boolean;
  partnerName: string;
  /** Mine vs theirs, for the labels and for who may remove what. */
  myUserId?: string;
  initial: EntryResponse[];
  revision?: number;
  /** The partner's reflection text; enables "Keep a line". Voice entries: omit. */
  entryText?: string | null;
}) {
  const { colors } = useTheme();
  const [responses, setResponses] = useState<EntryResponse[]>(initial);
  // null is closed. Otherwise the parent being answered, where null parent means
  // the reflection itself.
  const [replyTo, setReplyTo] = useState<{ parentId: string | null } | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const lines = useMemo(() => (entryText ? splitIntoLines(entryText) : []), [entryText]);

  useEffect(() => {
    if (revision > 0) setResponses(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const hearted = useMemo(() => responses.some((r) => r.kind === 'heart'), [responses]);
  const amened = useMemo(() => responses.some((r) => r.kind === 'amen'), [responses]);

  // The chain, by parent. Kept lines have no parent and sit at the top level
  // beside the opening replies, in the order they were left.
  const byParent = useMemo(() => {
    const m = new Map<string | null, EntryResponse[]>();
    for (const r of responses) {
      if (r.kind !== 'reply' && r.kind !== 'quote') continue;
      const key = r.parent_id ?? null;
      const list = m.get(key);
      if (list) list.push(r); else m.set(key, [r]);
    }
    return m;
  }, [responses]);

  const isMine = (r: EntryResponse) => !!myUserId && r.author_id === myUserId;

  const onToggle = async (kind: 'heart' | 'amen') => {
    if (busy) return;
    haptics.light();
    const had = responses.some((r) => r.kind === kind);
    const stub: EntryResponse = {
      id: `tmp-${kind}`, entry_id: entry.id, author_id: myUserId ?? 'me', kind,
      body: null, parent_id: null, created_at: '',
    };
    // optimistic
    setResponses((prev) => had ? prev.filter((r) => r.kind !== kind) : [...prev, stub]);
    try {
      await toggleReaction(entry.id, couplePlanId, dayNumber, kind);
    } catch {
      // revert
      setResponses((prev) => had ? [...prev, stub] : prev.filter((r) => r.kind !== kind));
      Alert.alert("Couldn't save that", 'Try again in a moment.');
    }
  };

  const onSendReply = async () => {
    const text = draft.trim();
    if (!text || busy || !replyTo) return;
    setBusy(true);
    haptics.medium();
    try {
      const saved = await addReply(entry.id, couplePlanId, dayNumber, text, replyTo.parentId);
      setResponses((prev) => [...prev, saved]);
      setDraft('');
      setReplyTo(null);
    } catch {
      Alert.alert("Couldn't send that", 'Your reply is still here. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const keptBodies = useMemo(
    () => new Set(responses.filter((r) => r.kind === 'quote').map((r) => r.body)),
    [responses],
  );

  const onKeepLine = async (line: string) => {
    if (busy || keptBodies.has(line)) return;
    setBusy(true);
    haptics.medium();
    try {
      const saved = await saveQuote(entry.id, couplePlanId, dayNumber, line);
      setResponses((prev) => [...prev, saved]);
      setQuoteOpen(false);
    } catch {
      Alert.alert("Couldn't keep that line", 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // Removing a reply takes the answers under it too, the way the cascade does.
  const onDelete = (r: EntryResponse) => {
    const hasChildren = (byParent.get(r.id) ?? []).length > 0;
    Alert.alert(
      'Remove this?',
      hasChildren
        ? "It'll be removed for both of you, along with the replies under it."
        : "It'll be removed for both of you.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const doomed = new Set<string>();
            const collect = (id: string) => {
              doomed.add(id);
              for (const child of byParent.get(id) ?? []) collect(child.id);
            };
            collect(r.id);
            setResponses((prev) => prev.filter((x) => !doomed.has(x.id)));
            try { await deleteResponse(r.id); } catch { Alert.alert("Couldn't remove that", 'Try again in a moment.'); }
          },
        },
      ],
    );
  };

  const openReply = (parentId: string | null) => {
    haptics.tap();
    setQuoteOpen(false);
    setReplyTo((cur) => (cur && cur.parentId === parentId ? null : { parentId }));
  };

  const Composer = (
    <View style={styles.replyBox}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={`Say something to ${partnerName}`}
        placeholderTextColor={colors.muted}
        style={[styles.replyInput, { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}
        multiline
        maxLength={280}
        autoFocus
      />
      <TouchableOpacity onPress={onSendReply} disabled={!draft.trim() || busy} activeOpacity={0.85}
        style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: !draft.trim() || busy ? 0.5 : 1 }]}>
        <Text variant="chip" color={colors.bg} style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  );

  // One bubble and everything answering it, drawn depth first so the chain
  // reads top to bottom in the order it was said.
  const thread = (parentId: string | null, depth: number): ReactNode =>
    (byParent.get(parentId) ?? []).map((r) => {
      const mine = isMine(r);
      const quote = r.kind === 'quote';
      const label = quote
        ? (mine ? `You kept this line` : `${partnerName} kept this line of yours`)
        : (mine ? 'You' : partnerName);
      return (
        <View key={r.id} style={{ marginLeft: Math.min(depth, MAX_INDENT_STEPS) * INDENT }}>
          <View style={[
            styles.bubble,
            {
              backgroundColor: colors.surface2,
              borderColor: mine ? colors.line : colors.lineAccent,
            },
          ]}>
            <View style={styles.bubbleHead}>
              {quote && <BookmarkSimple size={13} color={colors.accent2} weight="fill" />}
              <Text style={[styles.bubbleWho, { color: colors.accent2 }]}>{label}</Text>
            </View>
            <Text style={[quote ? styles.quoteText : styles.replyText, { color: colors.ink }]}>
              {quote ? `“${r.body}”` : r.body}
            </Text>
            <View style={styles.bubbleFoot}>
              <TouchableOpacity onPress={() => openReply(r.id)} hitSlop={8} activeOpacity={0.7}
                accessibilityRole="button" accessibilityLabel={`Reply to ${label}`}>
                <Text style={[styles.bubbleAction, { color: colors.muted }]}>Reply</Text>
              </TouchableOpacity>
              {mine && (
                <TouchableOpacity onPress={() => onDelete(r)} hitSlop={8}
                  accessibilityRole="button" accessibilityLabel="Remove">
                  <Trash size={13} color={colors.muted} weight="regular" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {replyTo?.parentId === r.id && Composer}
          {thread(r.id, depth + 1)}
        </View>
      );
    });

  const chain = thread(null, 0);
  const hasChain = (byParent.get(null) ?? []).length > 0;

  // My own reflection: no reactions to give and nothing to keep, but everything
  // they said is here and every line of it can be answered.
  if (!canRespond) {
    if (responses.length === 0) return null;
    return (
      <View style={[styles.readonly, { borderTopColor: colors.line2 }]}>
        {(hearted || amened) && (
          <View style={styles.badgeRow}>
            {hearted && <Heart size={15} color={colors.accent} weight="fill" />}
            {amened && <HandsPraying size={15} color={colors.accent} weight="fill" />}
            <Text style={[styles.badgeText, { color: colors.muted }]}>{partnerName} responded</Text>
          </View>
        )}
        {chain}
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
        <TouchableOpacity onPress={() => openReply(null)} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel="Reply"
          style={[styles.action, { borderColor: replyTo?.parentId === null && replyTo ? colors.accent : colors.line }]}>
          <ChatCircle size={15} color={colors.accent2} weight="regular" />
          <Text style={[styles.actionText, { color: colors.accent2 }]}>Reply</Text>
        </TouchableOpacity>
        {lines.length > 0 && (
          <TouchableOpacity onPress={() => { haptics.tap(); setQuoteOpen((o) => !o); setReplyTo(null); }} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel="Keep a line" accessibilityState={{ expanded: quoteOpen }}
            style={[styles.action, { borderColor: quoteOpen ? colors.accent : colors.line }]}>
            <BookmarkSimple size={15} color={colors.accent2} weight={quoteOpen ? 'fill' : 'regular'} />
            <Text style={[styles.actionText, { color: colors.accent2 }]}>Keep a line</Text>
          </TouchableOpacity>
        )}
      </View>

      {quoteOpen && (
        <View style={styles.linePicker}>
          <Text style={[styles.lineHint, { color: colors.muted }]}>Tap the line that stayed with you.</Text>
          {lines.map((line, i) => {
            const kept = keptBodies.has(line);
            return (
              <TouchableOpacity key={i} onPress={() => onKeepLine(line)} disabled={kept || busy} activeOpacity={0.75}
                accessibilityRole="button" accessibilityState={{ selected: kept }}
                style={[styles.lineRow, {
                  backgroundColor: kept ? colors.surface2 : 'transparent',
                  borderColor: kept ? colors.lineAccent : colors.line2,
                }]}>
                <Text style={[styles.lineText, { color: kept ? colors.accent2 : colors.ink }]}>{line}</Text>
                {kept && <BookmarkSimple size={13} color={colors.accent2} weight="fill" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {replyTo?.parentId === null && Composer}
      {hasChain && <View style={styles.chain}>{chain}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  actionText: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
  replyBox: { marginTop: 10, gap: 8 },
  replyInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: fonts.sans, fontSize: 14, minHeight: 44 },
  sendBtn: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  sendText: { fontSize: 11, letterSpacing: 0.8 },
  chain: { marginTop: 4 },
  bubble: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  bubbleWho: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  bubbleFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 8 },
  bubbleAction: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  replyText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21 },
  linePicker: { marginTop: 12, gap: 7 },
  lineHint: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.3 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  lineText: { flex: 1, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 },
  readonly: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.4 },
});
