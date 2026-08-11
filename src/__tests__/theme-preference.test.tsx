const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
}));

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Appearance, Text } from 'react-native';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';

// Spied rather than module-mocked: replacing all of react-native takes
// Platform and Text with it and the jest-expo preset stops working.
let listeners: ((p: any) => void)[] = [];
let scheme: 'light' | 'dark' = 'light';
let setSpy: jest.SpyInstance;

function Probe() {
  const { mode, preference } = useTheme();
  return <><Text testID="mode">{mode}</Text><Text testID="pref">{preference}</Text></>;
}

const emit = (colorScheme: string) => {
  if (colorScheme === 'light' || colorScheme === 'dark') scheme = colorScheme;
  act(() => { listeners.forEach((fn) => fn({ colorScheme })); });
};

beforeEach(() => {
  listeners = [];
  scheme = 'light';
  for (const k of Object.keys(mockStore)) delete mockStore[k];

  jest.restoreAllMocks();
  jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => scheme);
  setSpy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  jest.spyOn(Appearance, 'addChangeListener').mockImplementation((fn: any) => {
    listeners.push(fn);
    return { remove: () => { listeners = listeners.filter((l) => l !== fn); } } as any;
  });
});

// The phone was only ever the SEED: read once at mount, then ignored. A phone
// that went dark at sunset while Pamwe was open stayed light until relaunch,
// and there was no way to ask for that behaviour at all.
describe('ThemeProvider following the system', () => {
  it('follows the phone by default', async () => {
    scheme = 'dark';
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('dark'));
    expect(getByTestId('pref').props.children).toBe('system');
  });

  it('keeps following when the phone changes mid-session', async () => {
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('light'));

    emit('dark');
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('dark'));
  });

  it("reads 'unspecified' as a question, not as light", async () => {
    // The event carries 'unspecified' when an override is released. Treating
    // that as light would flip a dark phone to light for no reason.
    scheme = 'dark';
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('dark'));

    emit('unspecified');
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('dark'));
  });

  it('hands the scheme back to the OS while following it', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(setSpy).toHaveBeenCalledWith('unspecified'));
  });
});

describe('ThemeProvider with a pinned choice', () => {
  it('restores a stored light choice over a dark phone', async () => {
    mockStore['pamwe:theme'] = 'light';
    scheme = 'dark';
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('pref').props.children).toBe('light'));
    expect(getByTestId('mode').props.children).toBe('light');
  });

  it('ignores the phone once a mode is pinned', async () => {
    mockStore['pamwe:theme'] = 'light';
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('pref').props.children).toBe('light'));

    emit('dark');
    // Still light: a pinned choice is a choice.
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('light'));
  });

  it('treats a stored system choice as following the phone', async () => {
    mockStore['pamwe:theme'] = 'system';
    scheme = 'dark';
    const { getByTestId } = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(getByTestId('mode').props.children).toBe('dark'));
    expect(getByTestId('pref').props.children).toBe('system');
  });
});
