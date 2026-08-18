import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, configureApiClient } from './client';

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('contracts client — refresh mutex', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces concurrent 401s into a single /v1/auth/refresh call', async () => {
    let accessToken: string | null = 'stale-token';
    let refreshCalls = 0;

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
    });

    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = String(url);
      if (path.endsWith('/v1/auth/refresh')) {
        refreshCalls += 1;
        // Real network latency — lets both callers pile up on the same promise.
        await new Promise((resolve) => setTimeout(resolve, 5));
        return jsonResponse({ accessToken: 'fresh-token', expiresIn: 900 }, 200);
      }
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers?.authorization === 'Bearer fresh-token') {
        return jsonResponse({ count: 3 }, 200);
      }
      return jsonResponse({ code: 'AUTH_REQUIRED', title: 'Missing or expired token' }, 401);
    }) as unknown as typeof fetch;

    const [a, b] = await Promise.all([
      api.notifications.unreadCount(),
      api.notifications.unreadCount(),
    ]);

    expect(refreshCalls).toBe(1);
    expect(a).toEqual({ count: 3 });
    expect(b).toEqual({ count: 3 });
    expect(accessToken).toBe('fresh-token');
  });

  it('does not clear tokens or fire onAuthFailure when refresh loses a benign race', async () => {
    let accessToken: string | null = 'stale-token';
    const onAuthFailure = vi.fn();

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      onAuthFailure,
    });

    global.fetch = vi.fn((url: string | URL) => {
      const path = String(url);
      if (path.endsWith('/v1/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ code: 'REFRESH_RACE', title: 'Token already rotated. Retry' }, 401),
        );
      }
      return Promise.resolve(
        jsonResponse({ code: 'AUTH_REQUIRED', title: 'Missing or expired token' }, 401),
      );
    }) as unknown as typeof fetch;

    await expect(api.notifications.unreadCount()).rejects.toBeInstanceOf(ApiError);

    expect(accessToken).toBe('stale-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('clears tokens and fires onAuthFailure when refresh actually fails', async () => {
    let accessToken: string | null = 'stale-token';
    const onAuthFailure = vi.fn();

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      onAuthFailure,
    });

    global.fetch = vi.fn((url: string | URL) => {
      const path = String(url);
      if (path.endsWith('/v1/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ code: 'AUTH_REQUIRED', title: 'Session expired' }, 401),
        );
      }
      return Promise.resolve(
        jsonResponse({ code: 'AUTH_REQUIRED', title: 'Missing or expired token' }, 401),
      );
    }) as unknown as typeof fetch;

    await expect(api.notifications.unreadCount()).rejects.toBeInstanceOf(ApiError);

    expect(accessToken).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not clear tokens on a transient refresh failure', async () => {
    let accessToken: string | null = 'stale-token';
    const onAuthFailure = vi.fn();

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      onAuthFailure,
    });

    global.fetch = vi.fn((url: string | URL) => {
      const path = String(url);
      if (path.endsWith('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ code: 'UPSTREAM', title: 'Try again' }, 503));
      }
      return Promise.resolve(
        jsonResponse({ code: 'AUTH_REQUIRED', title: 'Missing or expired token' }, 401),
      );
    }) as unknown as typeof fetch;

    await expect(api.notifications.unreadCount()).rejects.toMatchObject({ status: 503 });
    expect(accessToken).toBe('stale-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});

const requestBody = (init?: RequestInit): unknown => {
  if (typeof init?.body !== 'string') {
    throw new Error('expected JSON string body');
  }
  return JSON.parse(init.body);
};

describe('contracts client — logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes refreshToken in the body when getRefreshToken returns a value', async () => {
    let accessToken: string | null = 'access';
    let refreshToken: string | null = 'refresh-abc';

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'mobile',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      getRefreshToken: () => refreshToken,
      setRefreshToken: (token) => {
        refreshToken = token;
      },
    });

    global.fetch = vi.fn((url: string | URL, init?: RequestInit) => {
      expect(String(url)).toMatch(/\/v1\/auth\/logout$/);
      expect(requestBody(init)).toEqual({ refreshToken: 'refresh-abc' });
      return Promise.resolve(jsonResponse({ ok: true }, 200));
    }) as unknown as typeof fetch;

    await api.logout();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  it('omits refreshToken when getRefreshToken returns nothing (web cookie path)', async () => {
    let accessToken: string | null = 'access';

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      getRefreshToken: () => null,
    });

    global.fetch = vi.fn((url: string | URL, init?: RequestInit) => {
      expect(String(url)).toMatch(/\/v1\/auth\/logout$/);
      expect(requestBody(init)).toEqual({});
      return Promise.resolve(jsonResponse({ ok: true }, 200));
    }) as unknown as typeof fetch;

    await api.logout();

    expect(accessToken).toBeNull();
  });

  it('clears local tokens even when the logout request fails', async () => {
    let accessToken: string | null = 'access';
    let refreshToken: string | null = 'refresh-abc';

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'mobile',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      getRefreshToken: () => refreshToken,
      setRefreshToken: (token) => {
        refreshToken = token;
      },
    });

    global.fetch = vi.fn((url: string | URL) => {
      expect(String(url)).toMatch(/\/v1\/auth\/logout$/);
      return Promise.resolve(jsonResponse({ code: 'UPSTREAM', title: 'Try again' }, 503));
    }) as unknown as typeof fetch;

    await expect(api.logout()).rejects.toMatchObject({ status: 503 });
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  it('posts logout-all with the access token and then clears local tokens', async () => {
    let accessToken: string | null = 'access';
    let refreshToken: string | null = 'refresh-abc';

    configureApiClient({
      baseUrl: '',
      clientPlatform: 'mobile',
      getAccessToken: () => accessToken,
      setAccessToken: (token) => {
        accessToken = token;
      },
      getRefreshToken: () => refreshToken,
      setRefreshToken: (token) => {
        refreshToken = token;
      },
    });

    global.fetch = vi.fn((url: string | URL, init?: RequestInit) => {
      expect(String(url)).toMatch(/\/v1\/auth\/logout-all$/);
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.authorization).toBe('Bearer access');
      return Promise.resolve(jsonResponse({ ok: true, revoked: 2 }, 200));
    }) as unknown as typeof fetch;

    await api.logoutAll();

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
