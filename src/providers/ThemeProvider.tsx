import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, themes, ThemeColors, ThemeMode } from '../theme/tokens';

const STORAGE_KEY = 'pamwe:theme';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Default = light tokens so components render correctly without a provider (e.g. in tests).
const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  mode: 'light',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') {
        setModeState(stored);
        Appearance.setColorScheme(stored);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    Appearance.setColorScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ colors: themes[mode], mode, setMode }),
    [mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
