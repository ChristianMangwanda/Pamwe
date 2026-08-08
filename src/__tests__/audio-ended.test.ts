// expo-audio's native module isn't there under jest, and importing it shims a
// prototype on load. hasEnded is pure, so stub the one function the module needs.
jest.mock('expo-audio', () => ({ setAudioModeAsync: jest.fn() }));

import { hasEnded } from '../lib/audioSession';

// Pressing play on a recording that already finished used to be silent: AVPlayer
// sits at the end of the item and play() there does nothing. Everything hangs on
// spotting that the player is parked at the end.
describe('hasEnded', () => {
  it('is true on the finish event', () => {
    expect(hasEnded({ didJustFinish: true, currentTime: 42, duration: 42 })).toBe(true);
  });

  it('is true when parked at the end after the event has passed', () => {
    expect(hasEnded({ didJustFinish: false, currentTime: 41.99, duration: 42 })).toBe(true);
  });

  it('is false mid-recording, so a paused player resumes where it stopped', () => {
    expect(hasEnded({ didJustFinish: false, currentTime: 20, duration: 42 })).toBe(false);
  });

  it('is false before the duration is known, so a first play is never a rewind', () => {
    expect(hasEnded({ didJustFinish: false, currentTime: 0, duration: 0 })).toBe(false);
  });
});
