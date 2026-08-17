import { describe, expect, it } from 'vitest';
import { config } from './tamagui.config';

const themeColor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value !== null && typeof value === 'object' && 'val' in value) {
    const inner = Reflect.get(value, 'val');
    if (typeof inner === 'string') return inner;
  }
  return String(value);
};

const theme = (name: 'light' | 'dark') => {
  const value = config.themes[name];
  if (value === undefined) throw new Error(`Missing ${name} theme`);
  return value;
};

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
});
