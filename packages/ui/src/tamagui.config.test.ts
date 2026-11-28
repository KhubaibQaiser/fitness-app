import { describe, expect, it } from 'vitest';
import { DESKTOP_MIN_WIDTH_PX } from './breakpoints';
import { config } from './tamagui.config';

const themeColor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value !== null && typeof value === 'object' && 'val' in value) {
    const inner = Reflect.get(value, 'val');
    if (typeof inner === 'string') return inner;
  }
  return String(value);
};

const theme = (name: 'light' | 'dark') => config.themes[name];

describe('GymOS design tokens', () => {
  it('maps coach primary to blue/700 in both themes', () => {
    expect(themeColor(theme('light').primary)).toBe('#1D4ED8');
    expect(themeColor(theme('dark').primary)).toBe('#1D4ED8');
  });

  it('uses zinc canvas and coach canvas tint', () => {
    expect(themeColor(theme('light').canvas)).toBe('#FAFAFA');
    expect(themeColor(theme('dark').canvas)).toBe('#09090B');
    expect(themeColor(theme('light').coachCanvas)).toBe('#F5F8FF');
    expect(themeColor(theme('dark').coachCanvas)).toBe('#0B1220');
  });

  it('installs client coral tokens on the default theme', () => {
    expect(themeColor(theme('light').clientAccentBg)).toBe('#E11D48');
    expect(themeColor(theme('dark').clientAccentBg)).toBe('#E11D48');
    expect(themeColor(theme('light').clientCanvasTint)).toBe('#FFF8F5');
    expect(themeColor(theme('dark').clientCanvasTint)).toBe('#150F14');
  });

  it('keeps alert and milestone semantics', () => {
    expect(themeColor(theme('light').alertText)).toBe('#EF4444');
    expect(themeColor(theme('light').milestoneFill)).toBe('#F59E0B');
    expect(themeColor(theme('dark').alertText)).toBe('#F87171');
  });

  it('keeps desktop breakpoint aligned with Tamagui md media', () => {
    expect(config.media.md.minWidth).toBe(DESKTOP_MIN_WIDTH_PX);
  });

  // U4: Tamagui 3 dropped config v4. These are the v4 values the app keeps, so the look holds.
  it('keeps the config v4 size, space and radius scales', () => {
    const value = (token: unknown) => Number(Reflect.get(Object(token), 'val') ?? token);
    expect(value(config.tokens.size['4'])).toBe(44);
    expect(value(config.tokens.space['4'])).toBe(18);
    expect(value(config.tokens.space['1-5'])).toBe(4);
    expect(value(config.tokens.radius['4'])).toBe(9);
  });

  it("gives Tamagui 3's skins kebab-case theme keys with the app's values", () => {
    expect(themeColor(theme('light')['border-color'])).toBe('#E4E4E7');
    expect(themeColor(theme('dark')['border-color'])).toBe('#27272A');
    expect(themeColor(theme('light')['border-color-hover'])).toBe('#D4D4D8');
    expect(themeColor(theme('light')['placeholder-color'])).toBe('#A1A1AA');
  });
});
