import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { BackInStep, markApart } from '../components/BackInStep';
import { ThemeProvider } from '../providers/ThemeProvider';

// Same discipline as the reveal ceremony's test: the pacing IS the feature, so
// every beat on the JS clock is asserted here and a refactor cannot quietly move
// one. Reanimated's own drivers are left to the device.
jest.mock('react-native-reanimated', () => {
  const { View, Image, Text } = require('react-native');
  // Everything motion.ts touches is chainable, and importing BackInStep
  // evaluates that whole module: `new Keyframe({...}).duration().delay()
  // .reduceMotion()`, and `SlideInDown.duration().easing(settle.factory())`.
  const chain: any = new Proxy({}, { get: () => () => chain });
  class Keyframe {
    duration() { return this; }
    delay() { return this; }
    reduceMotion() { return this; }
  }
  return {
    __esModule: true,
    default: { View, Image, Text },
    Keyframe,
    FadeOut: chain,
    SlideInDown: chain,
    Easing: { bezier: () => chain, linear: chain, ease: chain },
    ReduceMotion: { Never: 'never', System: 'system' },
  };
});

const mockFired: [number, string][] = [];
jest.mock('../lib/haptics', () => ({
  haptics: {
    tap: () => mockFired.push([Date.now(), 'tap']),
    light: () => mockFired.push([Date.now(), 'light']),
    medium: () => mockFired.push([Date.now(), 'medium']),
    success: () => mockFired.push([Date.now(), 'success']),
    celebrate: () => mockFired.push([Date.now(), 'celebrate']),
  },
}));

const mount = async (days: number[], reduceMotion: boolean) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  const onDone = jest.fn();
  const view = render(
    <ThemeProvider>
      <BackInStep days={days} onDone={onDone} />
    </ThemeProvider>,
  );
  // Let the accessibility read resolve, which is what starts the timeline.
  await act(async () => {});
  return { ...view, onDone };
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

describe('back in step, full timeline', () => {
  it('lands a day at a time and finishes on success', async () => {
    await mount([2, 3, 4], false);
    advance(5000);

    // MARK_FIRST 420, three days 150 apart, then the headline 260 after the last.
    expect(mockFired).toEqual([
      [420, 'light'],
      [570, 'light'],
      [720, 'light'],
      [980, 'success'],
    ]);
  });

  it('never reaches for celebrate, which belongs to the planting', async () => {
    // The tree is the app's biggest moment and its haptic is used exactly once.
    // Catching up is smaller on purpose, and must stay smaller.
    await mount([2, 3, 4, 5, 6, 7, 8], false);
    advance(5000);
    expect(mockFired.map(([, kind]) => kind)).not.toContain('celebrate');
    expect(mockFired.map(([, kind]) => kind)).not.toContain('medium');
  });

  it('thins the rhythm on a long run rather than drumming out every day', async () => {
    await mount([2, 3, 4, 5, 6, 7, 8], false);
    advance(5000);
    const lights = mockFired.filter(([, kind]) => kind === 'light');
    expect(lights).toHaveLength(3);
  });

  it('plays one beat and stops on Reduce Motion', async () => {
    await mount([2, 3, 4], true);
    advance(5000);
    expect(mockFired).toEqual([[0, 'success']]);
  });

  it('names the days it is celebrating', async () => {
    const { getByText } = await mount([2, 3, 4], false);
    expect(getByText('Day 2')).toBeTruthy();
    expect(getByText('Day 4')).toBeTruthy();
    expect(getByText('3 days, in one sitting.')).toBeTruthy();
  });

  it('goes silent when it unmounts mid-sequence', async () => {
    const { unmount } = await mount([2, 3, 4], false);
    advance(500);
    unmount();
    advance(5000);
    // Only the first day had landed. Nothing fires into a screen that is gone.
    expect(mockFired).toEqual([[420, 'light']]);
  });
});

describe('how far apart the days land', () => {
  it('gives a short run a beat each', () => {
    expect(markApart(2)).toBe(150);
    expect(markApart(3)).toBe(150);
    expect(markApart(4)).toBe(150);
  });

  it('tightens as the backlog grows, so a fortnight is over inside a second', () => {
    expect(markApart(7)).toBe(100);
    expect(markApart(14)).toBe(50);
    expect(markApart(20)).toBe(45);
  });

  it('never lets two days land on the same frame', () => {
    // A couple who left a 365 day plan alone for a year owes 365 days.
    expect(markApart(365)).toBe(45);
  });
});
