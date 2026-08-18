import { describe, expect, it } from 'vitest';
import {
  parseThemeMode,
  resolveThemeMode,
  THEME_MODE_KEY,
  themeBootstrapScript,
} from './theme-mode';

describe('theme mode resolution', () => {
  it('parses only light and dark', () => {
    expect(parseThemeMode('light')).toBe('light');
    expect(parseThemeMode('dark')).toBe('dark');
    expect(parseThemeMode('system')).toBeNull();
    expect(parseThemeMode(undefined)).toBeNull();
  });

  it('prefers the cookie over the OS, then falls back to prefers-color-scheme', () => {
    expect(resolveThemeMode({ cookie: 'light', prefersDark: true })).toBe('light');
    expect(resolveThemeMode({ cookie: 'dark', prefersDark: false })).toBe('dark');
    expect(resolveThemeMode({ cookie: null, prefersDark: true })).toBe('dark');
    expect(resolveThemeMode({ cookie: null, prefersDark: false })).toBe('light');
  });

  it('keeps the bootstrap script aligned with the cookie key', () => {
    const script = themeBootstrapScript();
    expect(script).toContain(THEME_MODE_KEY);
    expect(script).toContain('prefers-color-scheme: dark');
    expect(script).toContain('t_dark');
    expect(script).toContain('t_light');
    expect(script.startsWith('(function(){')).toBe(true);
  });
});
