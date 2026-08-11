import * as SecureStore from 'expo-secure-store';
import { configureApiClient } from '@gymos/contracts';

const ACCESS_KEY = 'gymos.accessToken';
const REFRESH_KEY = 'gymos.refreshToken';

let memoryAccess: string | null = null;

/**
 * Wire the shared contracts client for native: absolute API URL + SecureStore
 * for refresh (and access) tokens. Call once at app boot before any queries.
 */
export const configureMobileApiClient = (onAuthFailure?: () => void): void => {
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  if (!baseUrl) {
    console.warn(
      'EXPO_PUBLIC_API_URL is not set — API calls will fail until configured (e.g. http://localhost:8787)',
    );
  }

  configureApiClient({
    baseUrl,
    clientPlatform: 'mobile',
    getAccessToken: async () => {
      if (memoryAccess) return memoryAccess;
      memoryAccess = await SecureStore.getItemAsync(ACCESS_KEY);
      return memoryAccess;
    },
    setAccessToken: async (token) => {
      memoryAccess = token;
      if (token === null) await SecureStore.deleteItemAsync(ACCESS_KEY);
      else await SecureStore.setItemAsync(ACCESS_KEY, token);
    },
    getRefreshToken: async () => SecureStore.getItemAsync(REFRESH_KEY),
    setRefreshToken: async (token) => {
      if (token === null) await SecureStore.deleteItemAsync(REFRESH_KEY);
      else await SecureStore.setItemAsync(REFRESH_KEY, token);
    },
    ...(onAuthFailure !== undefined ? { onAuthFailure } : {}),
  });
};
