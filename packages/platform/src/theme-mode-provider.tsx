'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { Theme } from 'tamagui';
import {
  applyThemeToDocument,
  parseThemeMode,
  persistThemeModeCookie,
  type ThemeMode,
} from './theme-mode';

export type { ThemeMode } from './theme-mode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const persist = (mode: ThemeMode): void => {
  persistThemeModeCookie(mode);
  applyThemeToDocument(mode);
};

/**
 * Cookie-seeded light/dark mode. Wraps Tamagui `Theme` so `$token` colors match
 * the blocking first-paint script. No localStorage-after-mount flip.
 */
export const ThemeModeProvider = ({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) => {
  const [mode, setModeState] = useState<ThemeMode>(initialMode ?? 'light');

  useLayoutEffect(() => {
    const fromDom = parseThemeMode(document.documentElement.dataset.theme);
    if (fromDom === null) return;
    setModeState(fromDom);
    persist(fromDom);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist(next);
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
