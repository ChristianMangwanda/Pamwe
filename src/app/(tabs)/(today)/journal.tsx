import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LockSimple } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { VoiceRecorder, VoiceRecorderResult } from '../../../components/VoiceRecorder';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { haptics } from '../../../lib/haptics';
import { transcribeRecording } from '../../../lib/transcription';
import {
  createOrUpdateDraft,
  submitEntry,
  ensureVoiceDraft,
  uploadVoiceRecording,
  attachAudioToEntry,
} from '../../../lib/entries';

const AUTOSAVE_INTERVAL_MS = 5000;
type Mode = 'text' | 'voice';

function isNetworkError(err: any): boolean {
  return /network|fetch failed|connection/i.test(String(err?.message ?? ''));
}

export default function JournalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couplePlan, partner } = useCouple();
  const { myEntry, dayNumber, planDay, refresh } = useTodayEntry();
  const partnerName = partner?.display_name ?? 'your partner';
  const planTitle = couplePlan?.plan?.title ?? 'Reading plan';

  const [mode, setMode] = useState<Mode>(myEntry?.entry_type === 'voice' ? 'voice' : 'text');
  const [text, setText] = useState(myEntry?.text_content ?? '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const lastSavedRef = useRef(text);
  const entryIdRef = useRef<string | null>(myEntry?.id ?? null);

  useEffect(() => {
    if (myEntry?.text_content && !text) {
      setText(myEntry.text_content);
      lastSavedRef.current = myEntry.text_content;
      entryIdRef.current = myEntry.id;
    }
    if (myEntry?.entry_type === 'voice' && mode === 'text' && !myEntry.text_content) setMode('voice');
  }, [myEntry]);

  const saveDraft = useCallback(async () => {
    if (mode !== 'text') return;
    if (!couplePlan || text === lastSavedRef.current || myEntry?.submitted_at) return;
    try {
      setSaving(true);
      const entry = await createOrUpdateDraft(couplePlan.id, dayNumber, text);
      entryIdRef.current = entry.id;
      lastSavedRef.current = text;
    } catch {
      // silent autosave failure
    } finally {
      setSaving(false);
    }
  }, [couplePlan, dayNumber, text, myEntry?.submitted_at, mode]);

  useEffect(() => {
    if (mode !== 'text') return;
    const timer = setInterval(saveDraft, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [saveDraft, mode]);

  const handleSubmitText = () => {
    if (!text.trim()) return;
    Alert.alert(`Share with ${partnerName}?`, 'Once shared, your reflection is sealed and cannot be edited.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: async () => {
          try {
            setSubmitting(true);
            haptics.medium();
            const entry = await createOrUpdateDraft(couplePlan!.id, dayNumber, text);
            entryIdRef.current = entry.id;
            await submitEntry(entry.id);
            await refresh();
            router.replace('/(tabs)/(today)/waiting');
          } catch (err: any) {
            Alert.alert(
              'Could not send',
              isNetworkError(err)
                ? "You look offline. Your draft is saved. Try again when you're connected."
                : err.message ?? 'Failed to submit. Your draft is saved, so try again.',
            );
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleVoiceComplete = async (result: VoiceRecorderResult) => {
    if (!couplePlan) return;
    try {
      setUploadingVoice(true);
      haptics.medium();
      const draft = await ensureVoiceDraft(couplePlan.id, dayNumber);
      // Transcription runs on-device in parallel with the upload; it is
      // best-effort (null on any failure) and never blocks the entry.
      const [objectPath, transcript] = await Promise.all([
        uploadVoiceRecording(couplePlan.id, dayNumber, result.uri),
        transcribeRecording(result.uri),
      ]);
      await attachAudioToEntry(draft.id, objectPath, result.durationSeconds, transcript);
      await submitEntry(draft.id);
      await refresh();
      router.replace('/(tabs)/(today)/waiting');
    } catch (err: any) {
      Alert.alert(
        'Could not send recording',
        isNetworkError(err)
          ? "You look offline. Your recording is still here. Try again when you're connected."
          : err?.message ?? 'Upload failed. Your recording is still here, so try sending again.',
      );
    } finally {
      setUploadingVoice(false);
    }
  };

  const isSubmitted = !!myEntry?.submitted_at;

  const PromptCard = planDay?.reflection_prompt ? (
    <View style={[styles.promptCard, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
      <Text style={[styles.promptLabel, { color: colors.accent2 }]}>Today's prompt</Text>
      <Text italic style={{ fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 24, color: colors.accent }}>
        {planDay.reflection_prompt}
      </Text>
    </View>
  ) : null;

  const LockHint = (
    <View style={styles.lockHint}>
      <LockSimple size={14} color={colors.muted} />
      <Text color={colors.muted} style={styles.lockText}>Hidden until you've both reflected.</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <BackLink onPress={async () => { await saveDraft(); router.back(); }} label="Back to reading" />
          <Text style={[styles.eyebrow, { color: colors.muted }]}>{planTitle} · {planDay?.passage_reference}</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Your reflection</Text>
        </View>

        {!isSubmitted && (
          <View style={styles.toggle}>
            <SegmentedControl
              segments={[{ key: 'text', label: 'Write' }, { key: 'voice', label: 'Voice' }]}
              value={mode}
              onChange={(m) => setMode(m as Mode)}
            />
          </View>
        )}

        {mode === 'text' ? (
          <>
            <View style={styles.textBody}>
              {PromptCard}
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
                multiline
                placeholder={`Write honestly. Only ${partnerName} will see it, and only once you've both written…`}
                placeholderTextColor={colors.muted}
                value={text}
                onChangeText={setText}
                editable={!isSubmitted}
                textAlignVertical="top"
              />
              {LockHint}
            </View>
            {!isSubmitted && (
              <View style={styles.footer}>
                <Button title={`Share with ${partnerName}`} onPress={handleSubmitText} loading={submitting} disabled={!text.trim() || submitting} />
              </View>
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.voiceBody} keyboardShouldPersistTaps="handled">
            {PromptCard}
            <VoiceRecorder onComplete={handleVoiceComplete} />
            {LockHint}
            {uploadingVoice && (
              <View style={[styles.uploadOverlay, { backgroundColor: colors.bgOverlay }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text color={colors.ink2} style={styles.uploadingText}>Sending to {partnerName}…</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: GUTTER, paddingTop: 8 },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 14 },
  title: { fontFamily: fonts.serifLight, fontSize: 28, marginTop: 6 },
  toggle: { paddingHorizontal: GUTTER, marginTop: 16, alignItems: 'center' },
  textBody: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 16 },
  promptCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18, marginBottom: 16 },
  promptLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6 },
  textInput: { flex: 1, minHeight: 180, borderWidth: 1, borderRadius: 16, padding: 18, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27 },
  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  lockText: { fontFamily: fonts.sans, fontSize: 12 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12 },
  voiceBody: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12 },
  uploadingText: { textAlign: 'center' },
});
