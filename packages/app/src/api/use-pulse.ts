'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, type ClientScope } from '@gymos/contracts';
import { applyPulse, nextPulseDelay, type PulseSnapshot } from './pulse';
import { qk } from './query-keys';
// Resolves to use-foreground.native.ts (AppState) on native, page visibility on web.
import { useForeground } from './use-foreground';

/** What the pulse summarises: refetched when its ETag moves. */
// qk.today() and ['clients'] are prefixes: every scope and every roster search.
const PULSE_INVALIDATES = [qk.today(), qk.notifications, qk.dueCheckIns, ['clients']];

/**
 * Polls GET /v1/pulse with If-None-Match: every 30 s while it moves, every 2 min once idle,
 * paused in the background (`pulse.ts`). When the ETag moves it invalidates Today, notifications,
 * due check-ins and the roster (every scope). Without `scope` the server picks its default. Mount
 * it once per scope in the shell; another mount shares the query and its schedule rather than
 * doubling the polls.
 */
export const usePulse = (scope?: ClientScope) => {
  const queryClient = useQueryClient();
  const foreground = useForeground();
  const query = useQuery({
    queryKey: qk.pulse(scope),
    queryFn: async () => {
      const prev = queryClient.getQueryData<PulseSnapshot>(qk.pulse(scope));
      const next = await api.pulse(prev?.pulse.etag, scope);
      const { snapshot, invalidate } = applyPulse(prev, next, Date.now());
      if (invalidate) {
        for (const queryKey of PULSE_INVALIDATES) void queryClient.invalidateQueries({ queryKey });
      }
      return snapshot;
    },
    enabled: foreground,
    // The schedule below decides when to poll, not staleness or window focus.
    staleTime: Infinity,
  });
  const { refetch, dataUpdatedAt, errorUpdatedAt } = query;
  const changedAt = query.data?.changedAt;
  useEffect(() => {
    const lastFetchAt = Math.max(dataUpdatedAt, errorUpdatedAt);
    if (lastFetchAt === 0) return undefined; // useQuery makes the first fetch
    const delay = nextPulseDelay({
      foreground,
      now: Date.now(),
      lastFetchAt,
      changedAt: changedAt ?? lastFetchAt,
    });
    if (delay === null) return undefined;
    // cancelRefetch: false joins a poll already in flight (another mount) instead of restarting it.
    const timer = setTimeout(() => void refetch({ cancelRefetch: false }), delay);
    return () => {
      clearTimeout(timer);
    };
  }, [foreground, dataUpdatedAt, errorUpdatedAt, changedAt, refetch]);
  return query;
};
