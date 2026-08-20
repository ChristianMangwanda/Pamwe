import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { LockSimple } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { VoiceRecorder, VoiceRecorderResult } from '../../../components/VoiceRecorder';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { canOpenDay, opensOn, opensLabel, todayInTimezone } from '../../../lib/catchup';
import { useTodayEntry } from '../../../hooks/useTodayEntry';
import { haptics } from '../../../lib/haptics';
import { transcribeRecording } from '../../../lib/transcription';
import {
  getPendingVoice, rememberPendingVoice, forgetPendingVoice, type PendingVoice,
} from '../../../lib/pendingVoice';
import {
  createOrUpdateDraft,
  submitEntry,
  ensureVoiceDraft,
  uploadVoiceRecording,
  submitVoiceEntry,
  saveTranscript,
  getMyEntry,
  deleteLocalRecording,
} from '../../../lib/entries';

const AUTOSAVE_INTERVAL_MS = 5000;
type Mode = 'text' | 'voice';

function isNetworkError(err: any): boolean {
  return /network|fetch failed|connection/i.test(String(err?.message ?? ''));
}

export default function JournalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple, couplePlan, partner, loading: coupleLoading } = useCouple();
  // Pinned to the day this reflection is for. Unpinned, a partner tapping Amen
  // moved current_day out from under the open journal, and the next autosave
  // wrote these words into the NEXT day's entry, a day neither partner had
  // read, leaving the real day holding an older draft.
  const { day } = useLocalSearchParams<{ day?: string }>();
  const { myEntry, dayNumber, planDay, refresh } = useTodayEntry(day ? Number(day) : undefined);
  const partnerName = partner?.display_name ?? 'your partner';
  const planTitle = couplePlan?.plan?.title ?? 'Reading plan';

  // The cadence gate's real seal. Today's button and the plan list both stop
  // offering a day that is not open yet, but the journal is where the ritual
  // actually happens, so it is the one place that has to refuse. Nothing else
  // can be routed around: every path to writing comes through here.
  const todayISO = todayInTimezone(couple?.timezone ?? 'UTC');
  const cadence = couplePlan?.cadence_days ?? 1;
  const totalDays = couplePlan?.plan?.duration_days ?? 365;
  const tooEarly = !canOpenDay(dayNumber, couplePlan?.start_date, todayISO, totalDays, cadence);

  const [mode, setMode] = useState<Mode>(myEntry?.entry_type === 'voice' ? 'voice' : 'text');
  const [text, setText] = useState(myEntry?.text_content ?? '');
  const [, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  // A recording that was made but never landed. Read back on mount, so leaving
  // this screen (or closing the app) after a failed send no longer loses it.
  const [pendingVoice, setPendingVoice] = useState<PendingVoice | null>(null);
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

  // Postgres commits the seal before the response reaches us, so a dropped
  // response throws a network error for words that are already shared, and the
  // old copy told them the opposite. Ask the server what actually happened
  // before reporting a failure; if it landed, carry on to waiting as normal.
  const landedAnyway = useCallback(async () => {
    if (!couplePlan) return false;
    try {
      const actual = await getMyEntry(couplePlan.id, dayNumber);
      if (!actual?.submitted_at) return false;
      await refresh();
      router.replace({ pathname: '/(tabs)/today/waiting', params: { day: String(dayNumber) } });
      return true;
    } catch {
      return false;
    }
  }, [couplePlan, dayNumber, refresh, router]);

  const handleSubmitText = () => {
    if (!text.trim()) return;
    Alert.alert(`Share with ${partnerName}?`, "Once it's in, it's in. No edits after this.", [
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
            // Same as the voice path: waiting refetches for itself.
            router.replace({ pathname: '/(tabs)/today/waiting', params: { day: String(dayNumber) } });
          } catch (err: any) {
            if (await landedAnyway()) return;
            Sentry.captureException(err);
            Alert.alert(
              "Couldn't send it",
              isNetworkError(err)
                ? "You're offline. Don't worry, your words are saved. Send them when you're back."
                : err.message ?? 'Your words are saved. Try sending them again.',
            );
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // Only offered while the day is genuinely still unsent: a sealed entry means
  // the send landed on some other attempt, and the file is no longer wanted.
  useEffect(() => {
    if (!couplePlan?.id || myEntry?.submitted_at) { setPendingVoice(null); return; }
    let alive = true;
    getPendingVoice(couplePlan.id, dayNumber)
      .then((p) => { if (alive) setPendingVoice(p); })
      .catch(() => {});
    return () => { alive = false; };
  }, [couplePlan?.id, dayNumber, myEntry?.submitted_at]);

  const discardPendingVoice = () => {
    if (!couplePlan) return;
    Alert.alert(
      'Discard this recording?',
      'It has not been sent, and this cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            deleteLocalRecording(pendingVoice?.uri);
            forgetPendingVoice(couplePlan.id, dayNumber).catch(() => {});
            setPendingVoice(null);
          },
        },
      ],
    );
  };

  const handleVoiceComplete = async (result: VoiceRecorderResult) => {
    if (!couplePlan) return;
    try {
      setUploadingVoice(true);
      haptics.medium();
      // Side by side, not one after the other: the object path is derived from
      // the plan, the day and the user, so the upload never needed the draft
      // row to exist. Waiting for it just added two round trips to a send that
      // is already carrying a file.
      const [draft, objectPath] = await Promise.all([
        ensureVoiceDraft(couplePlan.id, dayNumber),
        uploadVoiceRecording(couplePlan.id, dayNumber, result.uri),
      ]);
      await submitVoiceEntry(draft.id, objectPath, result.durationSeconds);
      // It landed, so there is nothing left waiting to be sent.
      forgetPendingVoice(couplePlan.id, dayNumber).catch(() => {});
      // Transcription is deliberately NOT awaited. It runs the recognizer over
      // the whole recording with a 45s ceiling, and sending used to wait for
      // it, so the slowest part of sharing a reflection was an optional field.
      // The entry is sealed and delivered above; the transcript catches up.
      // Detached on purpose: this outlives the screen, so it must not touch
      // component state, and a failure leaves the entry as it already shipped.
      // The local file is the recognizer's input, so it has to outlive both the
      // upload above and this call. This is the last thing that needs it, and
      // the copy that matters is already in storage.
      transcribeRecording(result.uri)
        .then((t) => (t ? saveTranscript(draft.id, t) : undefined))
        .catch(() => {})
        .finally(() => deleteLocalRecording(result.uri));
      // Straight to waiting. It mounts its own useTodayEntry and refetches on
      // arrival, so refreshing this screen's copy first only made the sender
      // watch a spinner through a round trip whose result nothing reads: this
      // screen is about to unmount, and Today holds its own hook instance.
      router.replace({ pathname: '/(tabs)/today/waiting', params: { day: String(dayNumber) } });
    } catch (err: any) {
      if (await landedAnyway()) return;
      Sentry.captureException(err);
      // "Your recording is still here" was only true while this screen stayed
      // mounted: the recorder held the preview, and walking away lost the
      // pointer to a file still sitting in the cache. Remember it, so the offer
      // survives leaving, and closing the app.
      await rememberPendingVoice(couplePlan.id, dayNumber, {
        uri: result.uri,
        durationSeconds: result.durationSeconds,
      });
      setPendingVoice({ uri: result.uri, durationSeconds: result.durationSeconds });
      Alert.alert(
        "Couldn't send the recording",
        isNetworkError(err)
          ? "You're offline. Don't worry, your recording is still here. Send it when you're back."
          : err?.message ?? 'Your recording is still here. Try sending it again.',
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
      <Text color={colors.muted} style={styles.lockText}>Sealed until you've both written.</Text>
    </View>
  );

  // Nobody writes into a journal whose plan has not arrived yet.
  //
  // Every write on this screen is guarded by `if (!couplePlan) return`, which
  // is correct but silent, so on a cold launch the writing surface was live
  // while all of it was inert: the autosave no-opped (the 5s interval caught up
  // once the plan landed, so typed words survived), but leaving by the Back
  // link saves and navigates in one breath, and a voice recording finishing in
  // that window was dropped on the floor with no draft row to attach it to.
  // Holding the surface until the plan is known makes all three safe at once,
  // rather than teaching each one to wait.
  if (!couplePlan && coupleLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <BackLink onPress={() => router.back()} label="Back" />
        </View>
        <View style={styles.tooEarly}>
          <PamweLoading />
        </View>
      </SafeAreaView>
    );
  }

  // Refused, gently and with a date. A locked door with no reason on it reads
  // as a bug; a rhythm reads as a rhythm.
  if (tooEarly) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <BackLink onPress={() => router.back()} label="Back" />
        </View>
        <View style={styles.tooEarly}>
          <Text style={[styles.title, { color: colors.ink }]}>Day {dayNumber} is not open yet</Text>
          <Text style={[styles.tooEarlyBody, { color: colors.ink2 }]}>
            You have read today. This one opens {couplePlan?.start_date
              ? opensLabel(opensOn(couplePlan.start_date, dayNumber, cadence), todayISO)
              : 'tomorrow morning'}, so you can meet it together.
          </Text>
          <Text style={[styles.tooEarlyBody, { color: colors.muted }]}>
            The Bible tab is always open if you want to keep reading tonight.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            {/* Scrollable, not a plain View: with the keyboard up there isn't
                room for the prompt, a 180pt-minimum input, and the lock hint, so
                a fixed body pushed what you were typing under the keyboard.
                flexGrow lets the input still fill the space when there is room. */}
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.textBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {PromptCard}
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
                multiline
                placeholder="What's on your mind?"
                placeholderTextColor={colors.muted}
                value={text}
                onChangeText={setText}
                // The database ceiling (entries_text_content_length), mirrored
                // here so a long reflection is stopped by the field rather than
                // rejected by a save it has no way to explain. Nobody reaches it
                // by writing: the longest reflection anyone has written is 510
                // characters.
                maxLength={10000}
                editable={!isSubmitted}
                textAlignVertical="top"
              />
              {LockHint}
            </ScrollView>
            {!isSubmitted && (
              <View style={styles.footer}>
                <Button title={`Share with ${partnerName}`} onPress={handleSubmitText} loading={submitting} disabled={!text.trim() || submitting} />
              </View>
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.voiceBody} keyboardShouldPersistTaps="handled">
            {PromptCard}
            {/* A recording that was made but never landed. Above the recorder,
                because starting a new take would leave this one stranded. */}
            {pendingVoice && !uploadingVoice && (
              <View style={[styles.pending, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}>
                <Text style={[styles.pendingTitle, { color: colors.ink }]}>
                  Your recording is still here
                </Text>
                <Text style={[styles.pendingText, { color: colors.ink2 }]}>
                  {Math.max(1, Math.round(pendingVoice.durationSeconds))} seconds, saved on this phone
                  and never sent.
                </Text>
                <View style={styles.pendingActions}>
                  <Button title="Send it now" onPress={() => handleVoiceComplete(pendingVoice)} />
                  <Button
                    title="Discard"
                    variant="secondary"
                    onPress={discardPendingVoice}
                    style={styles.pendingDiscard}
                  />
                </View>
              </View>
            )}
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
  tooEarly: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 14 },
  tooEarlyBody: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, textAlign: 'center' },
  flex: { flex: 1 },
  header: { paddingHorizontal: GUTTER, paddingTop: 8 },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 14 },
  title: { fontFamily: fonts.serifLight, fontSize: 28, marginTop: 6 },
  toggle: { paddingHorizontal: GUTTER, marginTop: 16, alignItems: 'center' },
  textBody: { flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: 16 },
  promptCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18, marginBottom: 16 },
  promptLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6 },
  textInput: { flex: 1, minHeight: 180, borderWidth: 1, borderRadius: 16, padding: 18, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27 },
  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  lockText: { fontFamily: fonts.sans, fontSize: 12 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 12 },
  voiceBody: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12 },
  uploadingText: { textAlign: 'center' },
  pending: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 18 },
  pendingTitle: { fontFamily: fonts.serif, fontSize: 16 },
  pendingText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 5 },
  pendingActions: { marginTop: 14 },
  pendingDiscard: { marginTop: 8 },
});
