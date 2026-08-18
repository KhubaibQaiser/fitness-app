import { describe, expect, it } from 'vitest';
import { formatCoachTitle, greetingForHour } from './coach-greeting';

describe('coach greeting', () => {
  it('splits the day into morning, afternoon, and evening', () => {
    expect(greetingForHour(0)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(16)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Good evening');
  });

  it('includes the first name only after data is available', () => {
    const afternoon = new Date(2026, 7, 18, 15, 15, 0);
    expect(formatCoachTitle(afternoon, 'Khubaib')).toBe('Good afternoon, Khubaib');
  });
});
