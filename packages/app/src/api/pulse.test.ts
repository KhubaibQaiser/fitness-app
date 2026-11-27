import { describe, expect, it } from 'vitest';
import type { Pulse } from '@gymos/contracts';
import {
  applyPulse,
  nextPulseDelay,
  PULSE_ACTIVE_MS,
  PULSE_IDLE_AFTER_MS,
  PULSE_IDLE_MS,
} from './pulse';

const pulse = (etag: string, overdue = 1): Pulse => ({
  scope: 'mine',
  unreadCount: 0,
  counts: { redFlags: 0, plansBlocked: 0, overdue, dueToday: 0, drafts: 0 },
  etag,
});

describe('nextPulseDelay (backoff and pause)', () => {
  const at = (over: Partial<Parameters<typeof nextPulseDelay>[0]>) =>
    nextPulseDelay({
      foreground: true,
      now: 100_000,
      lastFetchAt: 100_000,
      changedAt: 100_000,
      ...over,
    });

  it('polls every 30 s while the pulse is moving', () => {
    expect(PULSE_ACTIVE_MS).toBe(30_000);
    expect(at({})).toBe(30_000);
    expect(at({ now: 110_000 })).toBe(20_000);
  });

  it('backs off to every 2 min once nothing has changed for five minutes', () => {
    expect(PULSE_IDLE_MS).toBe(120_000);
    const now = 100_000 + PULSE_IDLE_AFTER_MS;
    expect(at({ now, lastFetchAt: now })).toBe(120_000);
    expect(at({ now: now - 1, lastFetchAt: now - 1 })).toBe(30_000);
  });

  it('pauses in the background', () => {
    expect(at({ foreground: false })).toBeNull();
  });

  it('polls at once when a poll is overdue, as on return from the background', () => {
    expect(at({ now: 100_000 + 10 * 60_000 })).toBe(0);
  });
});

describe('applyPulse (invalidation)', () => {
  it('keeps the first pulse without invalidating: the screens fetched their own data', () => {
    expect(applyPulse(undefined, pulse('"a"'), 5)).toEqual({
      snapshot: { pulse: pulse('"a"'), changedAt: 5 },
      invalidate: false,
    });
  });

  it('invalidates when the ETag moves, and restarts the active window', () => {
    const prev = { pulse: pulse('"a"'), changedAt: 5 };
    expect(applyPulse(prev, pulse('"b"', 2), 9)).toEqual({
      snapshot: { pulse: pulse('"b"', 2), changedAt: 9 },
      invalidate: true,
    });
  });

  it('keeps the same snapshot on a 304 or an unchanged ETag', () => {
    const prev = { pulse: pulse('"a"'), changedAt: 5 };
    expect(applyPulse(prev, null, 9)).toEqual({ snapshot: prev, invalidate: false });
    expect(applyPulse(prev, null, 9).snapshot).toBe(prev);
    expect(applyPulse(prev, pulse('"a"'), 9).snapshot).toBe(prev);
  });

  it('fails loudly on a 304 with nothing cached', () => {
    expect(() => applyPulse(undefined, null, 9)).toThrow(/304/);
  });
});
