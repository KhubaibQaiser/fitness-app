import { storage } from '@gymos/platform';

/** Companion to the access JWT — persisted hint, not the web routing signal. */
export const AUTH_HINT_KEY = 'gymos.authOk';

const listeners = new Set<() => void>();

export const subscribeSessionPresence = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

export const getSessionPresence = (): boolean => storage.getItem(AUTH_HINT_KEY) === '1';

export const getServerSessionPresenceSnapshot = (): boolean => false;

export const setSessionPresence = (present: boolean): void => {
  if (present) storage.setItem(AUTH_HINT_KEY, '1');
  else storage.removeItem(AUTH_HINT_KEY);
  for (const listener of listeners) listener();
};
