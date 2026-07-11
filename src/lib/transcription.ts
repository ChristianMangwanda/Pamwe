import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// On-device transcription of a finished voice recording (Apple's speech
// recognizer via expo-speech-recognition, file-based). Nothing leaves the
// phone: requiresOnDeviceRecognition keeps the private reflection private.
//
// Strictly best-effort: any failure (permission denied, unsupported device,
// timeout, recognizer error) resolves to null and the voice entry ships
// without a transcript, exactly as before.
const TRANSCRIBE_TIMEOUT_MS = 45_000;

export async function transcribeRecording(uri: string): Promise<string | null> {
  try {
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!current.granted) {
      const asked = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!asked.granted) return null;
    }

    return await new Promise<string | null>((resolve) => {
      let text = '';
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resultSub.remove();
        endSub.remove();
        errorSub.remove();
        resolve(text.trim() || null);
      };

      const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        // File-based recognition streams a growing transcript; the latest
        // event carries the fullest text.
        const t = event.results?.[0]?.transcript;
        if (t) text = t;
      });
      const endSub = ExpoSpeechRecognitionModule.addListener('end', finish);
      const errorSub = ExpoSpeechRecognitionModule.addListener('error', finish);

      const timer = setTimeout(() => {
        try { ExpoSpeechRecognitionModule.abort(); } catch { /* already stopped */ }
        finish();
      }, TRANSCRIBE_TIMEOUT_MS);

      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          requiresOnDeviceRecognition: true,
          audioSource: { uri },
        });
      } catch {
        finish();
      }
    });
  } catch {
    return null;
  }
}
