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

describe('contracts client — problem request reference', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => null,
      setAccessToken: () => undefined,
    });
  });

  const problem = (extra: Record<string, unknown>) => ({
    type: 'https://gymos.app/problems/internal',
    title: 'Something went wrong on our side',
    status: 500,
    code: 'INTERNAL',
    ...extra,
  });

  it('exposes the problem body requestId on ApiError', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(jsonResponse(problem({ requestId: 'req-7f3a' }), 500)),
    );

    await expect(api.login('coach@pilot.local', 'any-password')).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL',
      requestId: 'req-7f3a',
    });
  });

  it('leaves requestId undefined when the body has none (e.g. a proxy error page)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 })),
    );

    const error: unknown = await api
      .login('coach@pilot.local', 'any-password')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error instanceof ApiError && error.requestId).toBeUndefined();
  });

  it('exposes requestId when the refresh call itself fails with a problem', async () => {
    global.fetch = vi.fn((url: string | URL) =>
      Promise.resolve(
        String(url).endsWith('/v1/auth/refresh')
          ? jsonResponse(problem({ status: 503, code: 'UPSTREAM', requestId: 'req-refresh' }), 503)
          : jsonResponse({ code: 'AUTH_REQUIRED', title: 'Missing or expired token' }, 401),
      ),
    ) as unknown as typeof fetch;

    await expect(api.notifications.unreadCount()).rejects.toMatchObject({
      status: 503,
      requestId: 'req-refresh',
    });
  });
});

describe('contracts client — pulse', () => {
  const pulse = {
    unreadCount: 2,
    counts: { redFlags: 0, plansBlocked: 0, overdue: 3, dueToday: 1, drafts: 0 },
    etag: '"abc"',
  };
  const sentHeaders: Record<string, string>[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    sentHeaders.length = 0;
    configureApiClient({
      baseUrl: '',
      clientPlatform: 'web',
      getAccessToken: () => 'token',
      setAccessToken: () => undefined,
    });
  });

  const serve = (response: () => Response) => {
    global.fetch = vi.fn((_url: string | URL, init?: RequestInit) => {
      sentHeaders.push(init?.headers as Record<string, string>);
      return Promise.resolve(response());
    }) as unknown as typeof fetch;
  };

  it('returns the pulse and sends no If-None-Match on the first call', async () => {
    serve(() => jsonResponse(pulse, 200));
    await expect(api.pulse()).resolves.toEqual(pulse);
    expect(sentHeaders[0]?.['if-none-match']).toBeUndefined();
  });

  it('sends the ETag back and reads a 304 as "not modified"', async () => {
    serve(() => new Response(null, { status: 304 }));
    await expect(api.pulse('"abc"')).resolves.toBeNull();
    expect(sentHeaders[0]?.['if-none-match']).toBe('"abc"');
    expect(sentHeaders[0]?.authorization).toBe('Bearer token');
  });

  it('throws an ApiError on a failure instead of reporting "not modified"', async () => {
    serve(() => jsonResponse({ title: 'Upstream down', status: 503, code: 'UPSTREAM' }, 503));
    await expect(api.pulse('"abc"')).rejects.toMatchObject({ status: 503, code: 'UPSTREAM' });
  });
});
