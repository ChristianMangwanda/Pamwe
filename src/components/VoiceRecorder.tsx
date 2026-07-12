import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { Play, Pause } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { useTheme } from '../providers/ThemeProvider';

const DEFAULT_MAX_SECONDS = 300;
const WAVEFORM_BARS = 32;
const METERING_FLOOR_DB = -60;

export type VoiceRecorderResult = {
  uri: string;
  durationSeconds: number;
};

export interface VoiceRecorderProps {
  maxDurationSeconds?: number;
  onComplete: (result: VoiceRecorderResult) => void;
  onDiscard?: () => void;
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function meterToHeight(db: number | undefined) {
  if (db == null || !isFinite(db)) return 0.05;
  const clamped = Math.max(METERING_FLOOR_DB, Math.min(0, db));
  const normalized = (clamped - METERING_FLOOR_DB) / -METERING_FLOOR_DB;
  return Math.max(0.05, normalized);
}

export function VoiceRecorder({
  maxDurationSeconds = DEFAULT_MAX_SECONDS,
  onComplete,
  onDiscard,
}: VoiceRecorderProps) {
  const { colors } = useTheme();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 100);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const stopRequestedRef = useRef(false);

  const meterHistoryRef = useRef<number[]>(Array(WAVEFORM_BARS).fill(0.05));
  const [meterTick, setMeterTick] = useState(0);

  useEffect(() => {
    (async () => {
      const current = await getRecordingPermissionsAsync();
      if (current.granted) {
        setPermissionGranted(true);
        return;
      }
      const requested = await requestRecordingPermissionsAsync();
      setPermissionGranted(requested.granted);
    })();
  }, []);

  useEffect(() => {
    if (!recorderState.isRecording) return;
    meterHistoryRef.current = [
      ...meterHistoryRef.current.slice(1),
      meterToHeight(recorderState.metering),
    ];
    setMeterTick((t) => t + 1);
  }, [recorderState.metering, recorderState.isRecording]);

  useEffect(() => {
    if (
      recorderState.isRecording &&
      recorderState.durationMillis >= maxDurationSeconds * 1000 &&
      !stopRequestedRef.current
    ) {
      stopRequestedRef.current = true;
      void handleStop();
    }
  }, [recorderState.durationMillis, recorderState.isRecording, maxDurationSeconds]);

  const handleStart = async () => {
    if (permissionGranted === false) {
      Alert.alert(
        'Microphone access needed',
        'Enable microphone access in Settings to record a voice reflection.',
      );
      return;
    }
    try {
      setPreparing(true);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      meterHistoryRef.current = Array(WAVEFORM_BARS).fill(0.05);
      stopRequestedRef.current = false;
      recorder.record();
    } catch (err: any) {
      Alert.alert("Couldn't start recording", err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setPreparing(false);
    }
  };

  const handleStop = async () => {
    try {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert("That one didn't record", 'No audio came through. Try once more.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setRecordedUri(uri);
      setRecordedDuration(Math.round(durationMs / 1000));
    } catch (err: any) {
      Alert.alert("Couldn't stop recording", err?.message ?? 'Something went wrong. Try again.');
    }
  };

  const handleDiscard = () => {
    setRecordedUri(null);
    setRecordedDuration(0);
    meterHistoryRef.current = Array(WAVEFORM_BARS).fill(0.05);
    onDiscard?.();
  };

  const handleAccept = () => {
    if (!recordedUri) return;
    onComplete({ uri: recordedUri, durationSeconds: recordedDuration });
  };

  if (permissionGranted === false) {
    return (
      <View style={styles.container}>
        <Text variant="body" color={colors.ink2} style={styles.permissionText}>
          Pamwe needs microphone access to record your voice reflection. Enable it in Settings.
        </Text>
      </View>
    );
  }

  if (recordedUri) {
    return <PlaybackUI uri={recordedUri} durationSeconds={recordedDuration} onAccept={handleAccept} onDiscard={handleDiscard} />;
  }

  const isRecording = recorderState.isRecording;
  const remaining = Math.max(0, maxDurationSeconds * 1000 - recorderState.durationMillis);

  return (
    <View style={styles.container}>
      <View style={styles.waveform}>
        {meterHistoryRef.current.map((h, i) => (
          <View
            key={`${i}-${meterTick}`}
            style={[styles.waveformBar, { backgroundColor: colors.accent, height: `${Math.round(h * 100)}%`, opacity: isRecording ? 1 : 0.3 }]}
          />
        ))}
      </View>

      <Text variant="heading" color={colors.ink} style={styles.timer}>{formatDuration(recorderState.durationMillis)}</Text>

      <Text variant="label" color={colors.muted} style={styles.hint}>
        {isRecording ? `${formatDuration(remaining)} left` : `Up to ${Math.floor(maxDurationSeconds / 60)} minutes`}
      </Text>

      {isRecording ? (
        <TouchableOpacity accessibilityLabel="Stop recording" onPress={handleStop} activeOpacity={0.85} style={[styles.recordButton, { backgroundColor: colors.accent2 }]}>
          <View style={[styles.stopSquare, { backgroundColor: colors.bg }]} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          accessibilityLabel="Start recording"
          onPress={handleStart}
          activeOpacity={0.85}
          disabled={preparing || permissionGranted == null}
          style={[styles.recordButton, { backgroundColor: colors.accent }, (preparing || permissionGranted == null) && styles.disabled]}
        >
          <View style={[styles.recordDot, { backgroundColor: colors.bg }]} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PlaybackUI({ uri, durationSeconds, onAccept, onDiscard }: { uri: string; durationSeconds: number; onAccept: () => void; onDiscard: () => void }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const currentTime = status.currentTime || 0;

  return (
    <View style={styles.container}>
      <View style={styles.playbackRow}>
        <TouchableOpacity
          accessibilityLabel={playing ? 'Pause playback' : 'Play recording'}
          onPress={() => (playing ? player.pause() : player.play())}
          activeOpacity={0.85}
          style={[styles.playButton, { backgroundColor: colors.accent }]}
        >
          {playing ? <Pause size={24} color={colors.bg} weight="fill" /> : <Play size={24} color={colors.bg} weight="fill" />}
        </TouchableOpacity>
        <View style={styles.playbackMeta}>
          <Text variant="body" color={colors.ink}>{formatDuration(currentTime * 1000)} / {formatDuration(durationSeconds * 1000)}</Text>
          <Text variant="label" color={colors.muted}>Your reflection</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Send to your partner" onPress={onAccept} />
        <Button title="Re-record" variant="ghost" onPress={onDiscard} style={styles.discardButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, gap: 12 },
  waveform: { flexDirection: 'row', alignItems: 'center', height: 80, gap: 3, width: '100%', justifyContent: 'center' },
  waveformBar: { width: 4, minHeight: 4, borderRadius: 2 },
  timer: { fontVariant: ['tabular-nums'] },
  hint: { marginBottom: 8 },
  recordButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  recordDot: { width: 28, height: 28, borderRadius: 14 },
  stopSquare: { width: 24, height: 24, borderRadius: 4 },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, width: '100%' },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  playbackMeta: { flex: 1 },
  actions: { width: '100%', gap: 8, marginTop: 8 },
  discardButton: { marginTop: 4 },
  permissionText: { textAlign: 'center', paddingHorizontal: 16 },
});
