import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'phosphor-react-native';
import { Text } from './ui/Text';
import { useTheme } from '../providers/ThemeProvider';
import { getSignedAudioUrl } from '../lib/entries';

export interface AudioPlayerProps {
  audioPath: string;
  durationSeconds: number;
  label?: string;
  accent?: 'primary' | 'partner';
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SIGN_TTL_SECONDS = 3600;
// Re-sign before the URL actually lapses so play never races the expiry.
const RESIGN_AFTER_MS = 50 * 60 * 1000;

export function AudioPlayer({ audioPath, durationSeconds, label, accent = 'primary' }: AudioPlayerProps) {
  const { colors } = useTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState(false);
  const signedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getSignedAudioUrl(audioPath, SIGN_TTL_SECONDS);
        if (!cancelled) { signedAt.current = Date.now(); setSignedUrl(url); }
      } catch {
        if (!cancelled) setUrlError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [audioPath]);

  const player = useAudioPlayer(signedUrl);
  const status = useAudioPlayerStatus(player);

  // #30: a signed URL lives 1 hour; a reveal left open longer used to fail
  // silently on play. Renew in place (position reset is fine, the old URL
  // couldn't have played anyway).
  const onTogglePlay = async () => {
    if (status.playing) return player.pause();
    if (Date.now() - signedAt.current > RESIGN_AFTER_MS) {
      try {
        const url = await getSignedAudioUrl(audioPath, SIGN_TTL_SECONDS);
        signedAt.current = Date.now();
        player.replace(url);
      } catch {
        // keep the old URL; play below surfaces whatever state it's in
      }
    }
    player.play();
  };

  if (urlError) {
    return (
      <View style={styles.container}>
        <Text variant="label" color={colors.muted}>Couldn't load this recording. Try again in a moment.</Text>
      </View>
    );
  }

  if (!signedUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const playing = status.playing;
  const currentTime = status.currentTime || 0;
  const buttonColor = accent === 'primary' ? colors.accent : colors.accent2;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityLabel={playing ? 'Pause playback' : 'Play recording'}
        onPress={onTogglePlay}
        activeOpacity={0.85}
        style={[styles.playButton, { backgroundColor: buttonColor }]}
      >
        {playing ? <Pause size={24} color={colors.bg} weight="fill" /> : <Play size={24} color={colors.bg} weight="fill" />}
      </TouchableOpacity>
      <View style={styles.meta}>
        <Text variant="body" color={colors.ink}>
          {formatDuration(currentTime * 1000)} / {formatDuration(durationSeconds * 1000)}
        </Text>
        {label && <Text variant="label" color={colors.muted}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
});
