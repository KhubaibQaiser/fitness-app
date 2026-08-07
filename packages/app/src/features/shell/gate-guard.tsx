'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import { storage } from '@gymos/platform';
import { LoadingState } from '@gymos/ui';
import { useMe } from '../../api';

/** Companion to the HttpOnly gate cookie — skips the full-screen gate spinner on return visits. */
export const GATE_HINT_KEY = 'gymos.gateOk';

const subscribe = () => () => undefined;
const getGateHint = () => storage.getItem(GATE_HINT_KEY) === '1';
const getServerGateHint = () => false;

/** Redirects to /enter when the access-gate cookie is missing or expired. */
export const GateGuard = ({ children }: { children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();
  const hasGateHint = useSyncExternalStore(subscribe, getGateHint, getServerGateHint);

  const gateBlocked = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (me.isSuccess) storage.setItem(GATE_HINT_KEY, '1');
  }, [me.isSuccess]);

  useEffect(() => {
    if (!gateBlocked) return;
    storage.removeItem(GATE_HINT_KEY);
    router.replace('/enter');
  }, [gateBlocked, router]);

  // First visit: wait for /v1/me. Returning devices: paint immediately; me loads in background.
  if (me.isPending && !hasGateHint) {
    return <LoadingState label="Checking access…" />;
  }
  if (gateBlocked) return <LoadingState label="Redirecting…" />;
  return <>{children}</>;
};
