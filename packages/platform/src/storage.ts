/**
 * Persistent KV storage façade.
 * Web: localStorage. Native (P3): swap implementation to AsyncStorage / MMKV
 * without changing call sites.
 */

const memory = new Map<string, string>();

/** No-op on web — native hydrates AsyncStorage into the sync mirror. */
export const hydrateStorage = (): Promise<void> => Promise.resolve();

const webStore = (): Storage | null => {
  try {
    // eslint-disable-next-line no-restricted-globals -- this file IS the platform façade
    if (typeof localStorage === 'undefined') return null;
    // eslint-disable-next-line no-restricted-globals -- this file IS the platform façade
    return localStorage;
  } catch {
    return null;
  }
};

export const storage = {
  getItem(key: string): string | null {
    const store = webStore();
    if (store) {
      try {
        return store.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    }
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    const store = webStore();
    if (!store) return;
    try {
      store.setItem(key, value);
    } catch {
      // private mode — in-memory still works for the session
    }
  },
  removeItem(key: string): void {
    memory.delete(key);
    const store = webStore();
    if (!store) return;
    try {
      store.removeItem(key);
    } catch {
      // ignore
    }
  },
};
