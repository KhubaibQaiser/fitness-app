import type { Pulse } from '@gymos/contracts';

/** Poll interval while the pulse is moving. */
export const PULSE_ACTIVE_MS = 30_000;
/** Poll interval once the pulse has been still for `PULSE_IDLE_AFTER_MS`. */
export const PULSE_IDLE_MS = 120_000;
export const PULSE_IDLE_AFTER_MS = 5 * 60_000;

/** The cached pulse, and when (client clock, ms) its ETag last moved. */
export type PulseSnapshot = { pulse: Pulse; changedAt: number };

/**
 * Fold one poll into the snapshot. `next` is null for a 304. `invalidate` says the ETag moved,
 * so the screens the pulse summarises are stale. The first pulse never invalidates.
 */
export const applyPulse = (
  prev: PulseSnapshot | undefined,
  next: Pulse | null,
  now: number,
): { snapshot: PulseSnapshot; invalidate: boolean } => {
  if (next === null) {
    if (prev === undefined) throw new Error('pulse answered 304 with no cached pulse');
    return { snapshot: prev, invalidate: false };
  }
  if (prev === undefined) return { snapshot: { pulse: next, changedAt: now }, invalidate: false };
  if (next.etag === prev.pulse.etag) return { snapshot: prev, invalidate: false };
  return { snapshot: { pulse: next, changedAt: now }, invalidate: true };
};

/** Milliseconds until the next poll, or null: paused while the app is in the background. */
export const nextPulseDelay = (at: {
  foreground: boolean;
  now: number;
  lastFetchAt: number;
  changedAt: number;
}): number | null => {
  if (!at.foreground) return null;
  const interval = at.now - at.changedAt >= PULSE_IDLE_AFTER_MS ? PULSE_IDLE_MS : PULSE_ACTIVE_MS;
  return Math.max(0, at.lastFetchAt + interval - at.now);
};
