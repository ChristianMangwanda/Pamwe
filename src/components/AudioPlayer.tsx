import { useEffect, useState } from 'react';
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

export function AudioPlayer({ audioPath, durationSeconds, label, accent = 'primary' }: AudioPlayerProps) {
  const { colors } = useTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getSignedAudioUrl(audioPath, 3600);
        if (!cancelled) setSignedUrl(url);
      } catch {
        if (!cancelled) setUrlError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [audioPath]);

  const player = useAudioPlayer(signedUrl);
  const status = useAudioPlayerStatus(player);

  if (urlError) {
    return (
      <View style={styles.container}>
        <Text variant="label" color={colors.muted}>Couldn't load recording.</Text>
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
        onPress={() => (playing ? player.pause() : player.play())}
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
