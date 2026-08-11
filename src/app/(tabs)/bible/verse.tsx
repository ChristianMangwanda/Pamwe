import { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Heart, HandsPraying, NotePencil, Trash } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { haptics } from '../../../lib/haptics';
import { supabase } from '../../../lib/supabase';
import { getMarksForChapter, VerseNote } from '../../../lib/verseMarks';
import {
  VerseNoteResponse, getNoteResponses, toggleNoteReaction, addNoteComment, deleteNoteResponse,
} from '../../../lib/verseDiscussion';

// The discussion on one verse: the note the couple keeps there, what each of
// them said back, and a box to say the next thing. The note stays a single
// shared note, so this page is where the second voice goes instead of
// overwriting the first.
export default function VerseDiscussion() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const params = useLocalSearchParams<{ book: string; chapter: string; verse: string }>();
  const book = params.book ?? '';
  const chapter = Number(params.chapter ?? 0);
  const verse = Number(params.verse ?? 0);
  const reference = `${book} ${chapter}:${verse}`;

  const [note, setNote] = useState<VerseNote | null>(null);
  const [responses, setResponses] = useState<VerseNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const partnerName = partner?.display_name ?? 'Your partner';
  const whose = (id: string) => (id === user?.id ? 'You' : partnerName);

  const load = useCallback(async () => {
    if (!couple?.id) return;
    try {
      const { notes } = await getMarksForChapter(couple.id, book, chapter);
      const mine = notes.find((n) => n.verse === verse) ?? null;
      setNote(mine);
      setResponses(mine ? await getNoteResponses(mine.id) : []);
    } catch {
      // The note is the page; a failed load leaves the empty state, which reads
      // the same as a verse nobody has written on yet.
    } finally {
      setLoading(false);
    }
  }, [couple?.id, book, chapter, verse]);

  useEffect(() => { load(); }, [load]);

  // Live, so a comment lands while you are both looking at the same verse.
  useEffect(() => {
    if (!couple?.id) return;
    const channel = supabase
      .channel(`verse-discussion-${couple.id}-${book}-${chapter}-${verse}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verse_note_responses', filter: `couple_id=eq.${couple.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verse_notes', filter: `couple_id=eq.${couple.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [couple?.id, book, chapter, verse, load]);

  const hearted = responses.some((r) => r.kind === 'heart' && r.user_id === user?.id);
  const amened = responses.some((r) => r.kind === 'amen' && r.user_id === user?.id);
  const heartCount = responses.filter((r) => r.kind === 'heart').length;
  const amenCount = responses.filter((r) => r.kind === 'amen').length;
  const comments = responses.filter((r) => r.kind === 'comment');

  // Guarded: the toggle reads before it writes, so a double tap would insert
  // twice and land on the unique index rather than turning back off.
  const onToggle = async (kind: 'heart' | 'amen') => {
    if (!note || !couple?.id || busy) return;
    setBusy(true);
    haptics.light();
    try {
      await toggleNoteReaction(note.id, couple.id, kind);
      await load();
    } catch {
      Alert.alert("Couldn't save that", 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !note || !couple?.id || busy) return;
    setBusy(true);
    haptics.medium();
    try {
      const saved = await addNoteComment(note.id, couple.id, text);
      setResponses((prev) => [...prev, saved]);
      setDraft('');
    } catch {
      Alert.alert("Couldn't send that", 'Your words are still here. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (r: VerseNoteResponse) => {
    Alert.alert('Remove this?', "It'll be removed for both of you.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setResponses((prev) => prev.filter((x) => x.id !== r.id));
          try { await deleteNoteResponse(r.id); } catch { Alert.alert("Couldn't remove that", 'Try again in a moment.'); }
        },
      },
    ]);
  };

  const editNote = () => {
    haptics.tap();
    router.push({
      pathname: '/(tabs)/bible/note',
      params: { book, chapter: String(chapter), verse: String(verse), text: note?.text ?? '' },
    } as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BackLink label={`${book} ${chapter}`} onPress={() => router.back()} />

          <Text style={[styles.eyebrow, { color: colors.accent }]}>{reference}</Text>
          <Text variant="h2" italic style={styles.title}>What you found here</Text>
          <Floral variant="divider" style={styles.divider} />

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
          ) : !note ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text color={colors.ink2} style={styles.empty}>
                Neither of you has written on this verse yet. A note here is the start of the conversation.
              </Text>
              <TouchableOpacity onPress={editNote} activeOpacity={0.8}
                style={[styles.noteBtn, { borderColor: colors.accent2 }]}
                accessibilityRole="button" accessibilityLabel="Add a note">
                <NotePencil size={16} color={colors.accent} />
                <Text style={[styles.noteBtnLabel, { color: colors.accent }]}>Add a note</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Text style={[styles.noteWho, { color: colors.accent2 }]}>{whose(note.user_id)} wrote</Text>
                <Text style={[styles.noteText, { color: colors.ink }]}>{note.text}</Text>

                <View style={[styles.reactRow, { borderTopColor: colors.line2 }]}>
                  <TouchableOpacity onPress={() => onToggle('heart')} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityLabel="Heart" accessibilityState={{ selected: hearted }}
                    style={[styles.react, { borderColor: hearted ? colors.accent : colors.line, backgroundColor: hearted ? colors.accent : 'transparent' }]}>
                    <Heart size={15} color={hearted ? colors.bg : colors.accent2} weight={hearted ? 'fill' : 'regular'} />
                    {heartCount > 1 && <Text style={[styles.reactCount, { color: hearted ? colors.bg : colors.accent2 }]}>{heartCount}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onToggle('amen')} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityLabel="Amen" accessibilityState={{ selected: amened }}
                    style={[styles.react, { borderColor: amened ? colors.accent : colors.line, backgroundColor: amened ? colors.accent : 'transparent' }]}>
                    <HandsPraying size={15} color={amened ? colors.bg : colors.accent2} weight={amened ? 'fill' : 'regular'} />
                    <Text style={[styles.reactLabel, { color: amened ? colors.bg : colors.accent2 }]}>
                      Amen{amenCount > 1 ? ` ${amenCount}` : ''}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.spacer} />
                  <TouchableOpacity onPress={editNote} hitSlop={8} activeOpacity={0.7}
                    accessibilityRole="button" accessibilityLabel="Edit the note">
                    <Text style={[styles.editLabel, { color: colors.muted }]}>Edit note</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {comments.map((c) => {
                const mine = c.user_id === user?.id;
                return (
                  <View key={c.id} style={[styles.comment, {
                    backgroundColor: colors.surface2,
                    borderColor: mine ? colors.line : colors.lineAccent,
                  }]}>
                    <View style={styles.commentHead}>
                      <Text style={[styles.commentWho, { color: colors.accent2 }]}>{whose(c.user_id)}</Text>
                      {mine && (
                        <TouchableOpacity onPress={() => onDelete(c)} hitSlop={8}
                          accessibilityRole="button" accessibilityLabel="Remove">
                          <Trash size={13} color={colors.muted} weight="regular" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.commentText, { color: colors.ink }]}>{c.body}</Text>
                  </View>
                );
              })}

              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={`Say something to ${partnerName}`}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line }]}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity onPress={onSend} disabled={!draft.trim() || busy} activeOpacity={0.85}
                  accessibilityRole="button" accessibilityLabel="Send"
                  style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: !draft.trim() || busy ? 0.5 : 1 }]}>
                  <Text variant="chip" color={colors.bg} style={styles.sendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8 },
  center: { paddingVertical: 40, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 16 },
  title: { marginTop: 8, lineHeight: 30 },
  divider: { width: 130, height: 26, marginTop: 12, opacity: 0.8 },
  card: { marginTop: 18, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  empty: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23 },
  noteWho: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  noteText: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, marginTop: 9 },
  reactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 13, borderTopWidth: 1 },
  react: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  reactLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
  reactCount: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
  spacer: { flex: 1 },
  editLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  noteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingVertical: 12, marginTop: 16 },
  noteBtnLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
  comment: { marginTop: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  commentWho: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  commentText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23 },
  composer: { marginTop: 18, gap: 9 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontFamily: fonts.sans, fontSize: 15, minHeight: 52 },
  sendBtn: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  sendText: { fontSize: 11, letterSpacing: 0.8 },
});
