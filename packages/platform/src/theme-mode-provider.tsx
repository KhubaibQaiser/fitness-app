'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Theme } from 'tamagui';
import { storage } from './storage';

export type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);
const KEY = 'gymos.themeMode';

const preferDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const readStored = (): ThemeMode | null => {
  const value = storage.getItem(KEY);
  return value === 'light' || value === 'dark' ? value : null;
};

/**
 * Persisted light/dark mode. Wraps Tamagui `Theme` so all `$token` colors flip.
 * Lives in platform so storage never leaks into packages/ui.
 */
export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setModeState(readStored() ?? (preferDark() ? 'dark' : 'dark'));
    setReady(true);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setItem(KEY, next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode, ready]);

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
