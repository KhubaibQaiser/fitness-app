'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import { storage } from '@gymos/platform';
import { LoadingState } from '@gymos/ui';
import { useMe } from '../../api';

/** Companion to the access JWT — skips the full-screen spinner on return visits. */
export const AUTH_HINT_KEY = 'gymos.authOk';

const subscribe = () => () => undefined;
const getAuthHint = () => storage.getItem(AUTH_HINT_KEY) === '1';
const getServerAuthHint = () => false;

/** Redirects to /enter when the access token is missing or refresh failed. */
export const GateGuard = ({ children }: { children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();
  const hasAuthHint = useSyncExternalStore(subscribe, getAuthHint, getServerAuthHint);

  const authBlocked = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (me.isSuccess) storage.setItem(AUTH_HINT_KEY, '1');
  }, [me.isSuccess]);

  useEffect(() => {
    if (!authBlocked) return;
    storage.removeItem(AUTH_HINT_KEY);
    router.replace('/enter');
  }, [authBlocked, router]);

  if (me.isPending && !hasAuthHint) {
    return <LoadingState label="Checking session…" />;
  }
  if (authBlocked) return <LoadingState label="Redirecting…" />;
  return <>{children}</>;
};
