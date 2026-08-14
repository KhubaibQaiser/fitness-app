'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import { api } from '@gymos/contracts';
import { setSessionPresence } from '../shell/session-presence';

type UseLogoutResult = {
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export const useLogout = (): UseLogoutResult => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = async (action: () => Promise<void>): Promise<void> => {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Sign out failed'));
    } finally {
      setSessionPresence(false);
      router.replace('/login');
      setIsPending(false);
    }
  };

  return {
    logout: () => run(() => api.logout()),
    logoutAll: () => run(() => api.logoutAll()),
    isPending,
    error,
  };
};
