'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import { LoadingState } from '@gymos/ui';
import { useMe } from '../../api';
import { setSessionPresence } from './session-presence';

export { AUTH_HINT_KEY } from './session-presence';

/** Overlay + /login only after silent refresh already failed (401). Not a first-paint router. */
export const GateGuard = ({ children }: { children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();

  const authBlocked = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (me.isSuccess) setSessionPresence(true);
  }, [me.isSuccess]);

  useEffect(() => {
    if (!authBlocked) return;
    setSessionPresence(false);
    router.replace('/login');
  }, [authBlocked, router]);

  if (authBlocked) return <LoadingState label="Redirecting…" />;
  return <>{children}</>;
};
