'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import { LoadingState } from '@gymos/ui';
import { useMe } from '../../api';

/** Redirects to /enter when the access-gate cookie is missing or expired. */
export const GateGuard = ({ children }: { children: ReactNode }) => {
  const me = useMe();
  const router = useRouter();

  const gateBlocked = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (gateBlocked) router.replace('/enter');
  }, [gateBlocked, router]);

  if (me.isPending) return <LoadingState label="Checking access…" />;
  if (gateBlocked) return <LoadingState label="Redirecting…" />;
  return <>{children}</>;
};
