import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { RevealCeremony } from '../components/RevealCeremony';
import { ThemeProvider } from '../providers/ThemeProvider';

// The ceremony's whole point is its pacing, and the marks are exact. Everything
// on the JS clock (the haptic score, the handoff to the cards) is asserted here
// so a refactor cannot quietly move a beat. The Reanimated drivers themselves
// are left to the device: Worklets has no native half under Jest, so the stub
// below just lets each shared value land on the value it was heading for.
jest.mock('react-native-reanimated', () => {
  const { View, Image, Text } = require('react-native');
  const noop = () => {};
  return {
    __esModule: true,
    default: { View, Image, Text },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (to: number) => to,
    withDelay: (_delay: number, anim: number) => anim,
    withSequence: (...anims: number[]) => anims[anims.length - 1],
    cancelAnimation: noop,
    runOnJS: (fn: () => void) => fn,
    Easing: { bezier: () => noop, linear: noop },
    ReduceMotion: { Never: 'never', System: 'system' },
  };
});

const mockFired: Array<[number, string]> = [];
jest.mock('../lib/haptics', () => ({
  haptics: {
    tap: () => mockFired.push([Date.now(), 'tap']),
    light: () => mockFired.push([Date.now(), 'light']),
    medium: () => mockFired.push([Date.now(), 'medium']),
    success: () => mockFired.push([Date.now(), 'success']),
    celebrate: () => mockFired.push([Date.now(), 'celebrate']),
  },
}));

const mount = async (reduceMotion: boolean) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  const onCardsIn = jest.fn();
  const onDone = jest.fn();
  const view = render(
    <ThemeProvider>
      <RevealCeremony myInitial="C" partnerInitial="A" onCardsIn={onCardsIn} onDone={onDone} />
    </ThemeProvider>,
  );
  // Let the accessibility read resolve, which is what starts the timeline.
  await act(async () => {});
  return { ...view, onCardsIn, onDone };
};

const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  mockFired.length = 0;
  jest.useFakeTimers();
  jest.setSystemTime(0);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('reveal ceremony, full timeline', () => {
  it('fires the haptic score on its marks and then goes silent', async () => {
    await mount(false);
    advance(5000);

    expect(mockFired).toEqual([
      [900, 'tap'],
      [1340, 'light'],
      [1620, 'light'],
      [1800, 'light'],
      [1900, 'light'],
      [1980, 'medium'],
      [2020, 'success'],
      [2050, 'light'],
      [2280, 'tap'],
    ]);
  });

  it('quickens as the orbs close', async () => {
    await mount(false);
    advance(2000);
    const gaps = mockFired.slice(1).map(([ms], i) => ms - mockFired[i][0]);
    expect(gaps).toEqual([440, 280, 180, 100, 80]);
  });

  it('calls for the cards 140ms into the lift, before the veil has cleared', async () => {
    const { onCardsIn } = await mount(false);
    advance(4399);
    expect(onCardsIn).not.toHaveBeenCalled();
    advance(1);
    expect(onCardsIn).toHaveBeenCalledWith('full');
  });
});

describe('reveal ceremony, skip', () => {
  it('unfurls the cards at once and fires no queued haptic', async () => {
    const { onCardsIn, getByLabelText } = await mount(false);
    advance(1000);
    expect(mockFired).toEqual([[900, 'tap']]);

    fireEvent.press(getByLabelText('Skip to your reflections'));
    expect(onCardsIn).toHaveBeenCalledWith('skip');

    advance(4000);
    expect(mockFired).toEqual([[900, 'tap']]);
    expect(onCardsIn).toHaveBeenCalledTimes(1);
  });

  it('past the settle, a tap only shortens the hold and runs the normal lift', async () => {
    const { onCardsIn, getByLabelText } = await mount(false);
    advance(4100);
    fireEvent.press(getByLabelText('Skip to your reflections'));

    // The full close, not the hurried one: the cards still come 140ms behind it.
    expect(onCardsIn).not.toHaveBeenCalled();
    advance(140);
    expect(onCardsIn).toHaveBeenCalledWith('full');
  });

  it('is ignored once the lift is already running', async () => {
    const { onCardsIn, getByLabelText } = await mount(false);
    advance(4300);
    fireEvent.press(getByLabelText('Skip to your reflections'));
    advance(100);
    expect(onCardsIn).toHaveBeenCalledWith('full');
    expect(onCardsIn).toHaveBeenCalledTimes(1);
  });
});

describe('reveal ceremony, reduce motion', () => {
  it('fires one haptic on the orbs arriving and nothing else', async () => {
    await mount(true);
    advance(2500);
    expect(mockFired).toEqual([[320, 'success']]);
  });

  it('crossfades the cards in place at 1620', async () => {
    const { onCardsIn } = await mount(true);
    advance(1619);
    expect(onCardsIn).not.toHaveBeenCalled();
    advance(1);
    expect(onCardsIn).toHaveBeenCalledWith('reduced');
  });
});
