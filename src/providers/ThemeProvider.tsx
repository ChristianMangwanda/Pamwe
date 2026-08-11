import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, themes, ThemeColors, ThemeMode, ThemePreference } from '../theme/tokens';

const STORAGE_KEY = 'pamwe:theme';

interface ThemeContextValue {
  colors: ThemeColors;
  /** What is on screen right now. Everything that paints reads this. */
  mode: ThemeMode;
  /** What the user chose. 'system' means "follow the phone". */
  preference: ThemePreference;
  setMode: (preference: ThemePreference) => void;
}

// Default = light tokens so components render correctly without a provider (e.g. in tests).
const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  mode: 'light',
  preference: 'light',
  setMode: () => {},
});

const systemMode = (): ThemeMode => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The phone was only ever the SEED before: read once at mount, then ignored.
  // A phone that switched to dark at sunset while Pamwe was open stayed light
  // until the app was relaunched, and there was no way to ask for that at all.
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [deviceMode, setDeviceMode] = useState<ThemeMode>(systemMode);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setPreference(stored);
        }
        // Anything else (a missing key, or a value from before this existed)
        // leaves the default of following the phone.
      })
      .catch(() => {});
  }, []);

  // Follow the phone for as long as that is what was asked for. Without the
  // listener 'system' would be a one-time reading rather than a preference.
  useEffect(() => {
    if (preference !== 'system') return;
    setDeviceMode(systemMode());
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      // The event can carry 'unspecified', which is not "light": it means the
      // override was released, so ask what the phone actually is.
      if (colorScheme === 'light' || colorScheme === 'dark') setDeviceMode(colorScheme);
      else setDeviceMode(systemMode());
    });
    return () => sub.remove();
  }, [preference]);

  const mode: ThemeMode = preference === 'system' ? deviceMode : preference;

  // Tell the OS only when the user has actually pinned a mode. Forcing a scheme
  // while following the system would silence the very changes we listen for.
  useEffect(() => {
    // 'unspecified' is how this React Native hands the scheme back to the OS;
    // ColorSchemeName has no null member, so it cannot be written as one.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setMode = useCallback((next: ThemePreference) => {
    setPreference(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ colors: themes[mode], mode, preference, setMode }),
    [mode, preference, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
