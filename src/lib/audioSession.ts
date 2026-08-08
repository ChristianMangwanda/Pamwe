import { setAudioModeAsync } from 'expo-audio';
import type { AudioStatus } from 'expo-audio';

// iOS starts every app in the .soloAmbient category, which the ring/silent
// switch mutes. Recording was the only thing in Pamwe that ever set a category,
// so a reflection played on a silenced phone ran the timer with no sound, and
// only worked if you happened to have recorded something earlier in the same
// launch (which left the session in .playback). A tapped recording is media the
// listener asked for, so it plays through the switch, like a voice message
// anywhere else.
export function setPlaybackAudioMode() {
  return setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

// The mic needs .playAndRecord, which is quieter and routes differently, so it
// is only ever on while the recorder is actually recording.
export function setRecordingAudioMode() {
  return setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

// AVPlayer parks at the end of a finished item, and play() there is silent
// rather than an error: nothing moves and no sound comes out. Hearing a
// recording a second time means rewinding first.
const END_EPSILON_SECONDS = 0.05;

export function hasEnded(status: Pick<AudioStatus, 'didJustFinish' | 'currentTime' | 'duration'>) {
  if (status.didJustFinish) return true;
  return status.duration > 0 && status.currentTime >= status.duration - END_EPSILON_SECONDS;
}
