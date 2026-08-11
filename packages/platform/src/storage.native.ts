/**
 * Native KV storage — in-memory mirror with AsyncStorage persistence.
 * Sync API matches the web façade; hydrate on app boot via `hydrateStorage`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();

/** Load persisted keys into the sync mirror before first paint when possible. */
export const hydrateStorage = async (): Promise<void> => {
  const pairs = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
  for (const [key, value] of pairs) {
    if (value !== null) memory.set(key, value);
  }
};

export const storage = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    void AsyncStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    memory.delete(key);
    void AsyncStorage.removeItem(key);
  },
};
