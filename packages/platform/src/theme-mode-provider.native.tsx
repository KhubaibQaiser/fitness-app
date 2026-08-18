'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { Theme } from 'tamagui';
import { storage } from './storage';
import { parseThemeMode, THEME_MODE_KEY, type ThemeMode } from './theme-mode';

export type { ThemeMode } from './theme-mode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const readStored = (): ThemeMode | null => parseThemeMode(storage.getItem(THEME_MODE_KEY));

/** Persisted light/dark mode for native — no `document` / CSS color-scheme. */
export const ThemeModeProvider = ({
  children,
}: {
  children: ReactNode;
  /** Web-only cookie seed; ignored on native. */
  initialMode?: ThemeMode;
}) => {
  const [mode, setModeState] = useState<ThemeMode>(
    () => readStored() ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'),
  );

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setItem(THEME_MODE_KEY, next);
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (readStored() !== null) return;
      setModeState(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      sub.remove();
    };
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
      <Theme name={mode}>{children}</Theme>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext);
  if (ctx === null) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
};
