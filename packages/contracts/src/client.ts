import type * as T from './types';

/**
 * Typed API client — the ONLY http transport feature code may use
 * (raw fetch is lint-banned in packages/app).
 *
 * Web (default): relative URLs, same-origin cookies for refresh (`gymos_refresh`)
 * and access (`gymos_access`) JWTs; in-memory access token is still set after
 * login/refresh for Bearer when present. On reload the HttpOnly access cookie
 * authenticates without a prior refresh.
 * Mobile: call `configureApiClient` with an absolute `baseUrl` and secure-store
 * backed token getters/setters.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(`${code}: ${title}`);
  }
}

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ClientConfig = {
  baseUrl: string;
  clientPlatform: 'web' | 'mobile';
  /** Return the current access token (Bearer), or null. */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Persist a new access token (or clear with null). */
  setAccessToken: (token: string | null) => void | Promise<void>;
  /** Return the raw refresh token for native clients (web uses httpOnly cookie). */
  getRefreshToken?: () => string | null | Promise<string | null>;
  /** Persist refresh token on native (web ignores — cookie handles it). */
  setRefreshToken?: (token: string | null) => void | Promise<void>;
  /** Called after a hard auth failure (refresh also failed). */
  onAuthFailure?: () => void;
};

let memoryAccessToken: string | null = null;

let config: ClientConfig = {
  baseUrl: '',
  clientPlatform: 'web',
  getAccessToken: () => memoryAccessToken,
  setAccessToken: (token) => {
    memoryAccessToken = token;
  },
};

export const configureApiClient = (next: Partial<ClientConfig>): void => {
  config = { ...config, ...next };
};

export const getApiClientConfig = (): Readonly<ClientConfig> => config;

type RequestOptions = { idempotent?: boolean; skipAuth?: boolean; _retried?: boolean };

const parseProblem = async (response: Response): Promise<T.Problem | null> =>
  (await response.json().catch(() => null)) as T.Problem | null;

const throwApiError = async (response: Response): Promise<never> => {
  const problem = await parseProblem(response);
  throw new ApiError(
    response.status,
    problem?.code ?? 'UNKNOWN',
    problem?.title ?? response.statusText,
    problem?.detail,
  );
};

/**
 * In-flight refresh promise, shared by every caller that hits a 401 at the
 * same time. Without this, N concurrent requests each losing their access
 * token would fire N `/v1/auth/refresh` calls — wasting a refresh-token
 * rotation per extra call and racing the server's reuse detection. Only the
 * first caller performs the network call; everyone else awaits its result.
 */
let inFlightRefresh: Promise<boolean> | null = null;

const performRefresh = async (): Promise<boolean> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-client-version': config.clientPlatform === 'mobile' ? 'pilot-mobile' : 'pilot-web',
    'x-client-platform': config.clientPlatform,
  };
  const body: { refreshToken?: string } = {};
  if (config.getRefreshToken) {
    const refresh = await config.getRefreshToken();
    if (refresh) body.refreshToken = refresh;
  }

  const response = await fetch(`${config.baseUrl}/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // A benign race with another refresh (REFRESH_RACE) must NOT clear
    // tokens or trigger onAuthFailure — the sibling call that won the race
    // already installed a fresh, valid token pair.
    const problem = await parseProblem(response);
    if (problem?.code === 'REFRESH_RACE') return false;
    if (response.status === 401 || response.status === 403) {
      await config.setAccessToken(null);
      await config.setRefreshToken?.(null);
      config.onAuthFailure?.();
      return false;
    }
    throw new ApiError(
      response.status,
      problem?.code ?? 'UNKNOWN',
      problem?.title ?? response.statusText,
      problem?.detail,
    );
  }
  const data = (await response.json()) as T.AuthTokens;
  await config.setAccessToken(data.accessToken);
  if (data.refreshToken) await config.setRefreshToken?.(data.refreshToken);
  return true;
};

const refreshAccessToken = (): Promise<boolean> => {
  inFlightRefresh ??= performRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};

const request = async <TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<TResponse> => {
  const headers: Record<string, string> = {
    'x-client-version': config.clientPlatform === 'mobile' ? 'pilot-mobile' : 'pilot-web',
    'x-client-platform': config.clientPlatform,
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (options.idempotent === true) headers['idempotency-key'] = uuid();

  if (options.skipAuth !== true) {
    const token = await config.getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 && options.skipAuth !== true && options._retried !== true) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<TResponse>(method, path, body, { ...options, _retried: true });
    }
  }

  if (!response.ok) await throwApiError(response);
  return (await response.json()) as TResponse;
};

const requestBlob = async (path: string): Promise<Blob> => {
  const headers: Record<string, string> = {
    'x-client-version': config.clientPlatform === 'mobile' ? 'pilot-mobile' : 'pilot-web',
    'x-client-platform': config.clientPlatform,
  };
  const token = await config.getAccessToken();
  if (token) headers.authorization = `Bearer ${token}`;

  let response = await fetch(`${config.baseUrl}${path}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = { ...headers };
      const next = await config.getAccessToken();
      if (next) retryHeaders.authorization = `Bearer ${next}`;
      else delete retryHeaders.authorization;
      response = await fetch(`${config.baseUrl}${path}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: retryHeaders,
      });
    }
  }

  if (!response.ok) await throwApiError(response);
  return response.blob();
};

export const api = {
  login: async (email: string, password: string): Promise<T.AuthTokens> => {
    const data = await request<T.AuthTokens>(
      'POST',
      '/v1/auth/login',
      { email, password },
      { skipAuth: true },
    );
    await config.setAccessToken(data.accessToken);
    if (data.refreshToken) await config.setRefreshToken?.(data.refreshToken);
    return data;
  },
  signupCoachStart: (input: T.SignupCoachStartInput) =>
    request<{ ok: boolean }>('POST', '/v1/auth/signup/coach/start', input, { skipAuth: true }),
  signupCoachConfirm: async (email: string, code: string): Promise<T.AuthTokens> => {
    const data = await request<T.AuthTokens>(
      'POST',
      '/v1/auth/signup/coach/confirm',
      { email, code },
      { skipAuth: true },
    );
    await config.setAccessToken(data.accessToken);
    if (data.refreshToken) await config.setRefreshToken?.(data.refreshToken);
    return data;
  },
  signupCoachResend: (email: string) =>
    request<{ ok: boolean }>('POST', '/v1/auth/signup/coach/resend', { email }, { skipAuth: true }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>('POST', '/v1/auth/password/forgot', { email }, { skipAuth: true }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ ok: boolean }>(
      'POST',
      '/v1/auth/password/reset',
      { email, code, newPassword },
      { skipAuth: true },
    ),
  logout: async (): Promise<void> => {
    try {
      await request<{ ok: boolean }>('POST', '/v1/auth/logout', {}, { skipAuth: true });
    } finally {
      await config.setAccessToken(null);
      await config.setRefreshToken?.(null);
    }
  },
  publicConfig: () =>
    request<T.PublicConfig>('GET', '/v1/config/public', undefined, { skipAuth: true }),
  me: {
    get: () => request<T.Me>('GET', '/v1/me'),
    update: (input: T.UpdateMeInput) => request<T.Me>('PATCH', '/v1/me', input),
  },

  clients: {
    list: (q?: string) =>
      request<{ items: T.ClientListItem[] }>(
        'GET',
        `/v1/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      ),
    create: (input: {
      name: string;
      sex: 'F' | 'M';
      dob?: string;
      phone?: string;
      email?: string;
      heightCm?: number;
      activityLevel?: number;
      medicalFlags?: {
        pregnant?: boolean;
        conditions?: string[];
        physicianClearanceRequired?: boolean;
      };
    }) => request<T.Client>('POST', '/v1/clients', input, { idempotent: true }),
    onboard: (input: T.OnboardClientInput) =>
      request<T.OnboardClientResult>('POST', '/v1/clients/onboard', input, { idempotent: true }),
    detail: (clientId: string) => request<T.ClientDetail>('GET', `/v1/clients/${clientId}`),
    update: (clientId: string, input: Record<string, unknown>) =>
      request<T.Client>('PATCH', `/v1/clients/${clientId}`, input),
    credentialsPdf: (clientId: string): Promise<Blob> =>
      requestBlob(`/v1/clients/${clientId}/credentials.pdf`),
  },

  vitals: {
    list: (clientId: string) =>
      request<{ items: T.Vitals[] }>('GET', `/v1/clients/${clientId}/vitals`),
    record: (clientId: string, input: Record<string, number | string | undefined>) =>
      request<T.Vitals>('POST', `/v1/clients/${clientId}/vitals`, input, { idempotent: true }),
  },

  dietary: {
    get: (clientId: string) =>
      request<{ profile: T.DietaryProfile }>('GET', `/v1/clients/${clientId}/dietary-profile`),
    put: (clientId: string, restrictions: T.Restriction[]) =>
      request<{ profile: NonNullable<T.DietaryProfile>; planFlagged: boolean }>(
        'PUT',
        `/v1/clients/${clientId}/dietary-profile`,
        { restrictions },
      ),
  },

  goals: {
    list: (clientId: string) =>
      request<{ items: T.Goal[] }>('GET', `/v1/clients/${clientId}/goals`),
    create: (
      clientId: string,
      input: {
        preset: T.Goal['preset'];
        rate: T.Goal['rate'];
        startWeightKg: number;
        targetWeightKg?: number;
        targetDate?: string;
        checkinWeekday?: number;
        bodyFatPct?: number;
      },
    ) => request<T.Goal>('POST', `/v1/clients/${clientId}/goals`, input, { idempotent: true }),
    setStatus: (goalId: string, status: 'ACHIEVED' | 'ABANDONED') =>
      request<T.Goal>('PATCH', `/v1/goals/${goalId}`, { status }),
  },

  checkIns: {
    due: () => request<{ items: T.DueCheckIn[] }>('GET', '/v1/check-ins'),
    forClient: (clientId: string) =>
      request<{ items: T.CheckIn[] }>('GET', `/v1/clients/${clientId}/check-ins`),
    get: (checkInId: string) => request<T.CheckIn>('GET', `/v1/check-ins/${checkInId}`),
    complete: (
      clientId: string,
      input: {
        vitals?: Record<string, number | string | undefined>;
        adherenceRating?: 1 | 2 | 3 | 4 | 5;
        coachNotes?: string;
      },
    ) =>
      request<{ checkInId: string; verdict: T.Verdict; vitalsId: string | null }>(
        'POST',
        `/v1/clients/${clientId}/check-ins`,
        input,
        { idempotent: true },
      ),
    update: (
      checkInId: string,
      input: {
        vitals?: Record<string, number | string | undefined>;
        adherenceRating?: 1 | 2 | 3 | 4 | 5;
        coachNotes?: string;
      },
    ) =>
      request<{ checkInId: string; verdict: T.Verdict; vitalsId: string | null }>(
        'PATCH',
        `/v1/check-ins/${checkInId}`,
        input,
      ),
    apply: (checkInId: string) =>
      request<T.ApplyResult>('POST', `/v1/check-ins/${checkInId}/apply`, undefined, {
        idempotent: true,
      }),
  },

  foods: {
    list: (q?: string) =>
      request<{ items: T.Food[] }>('GET', `/v1/foods${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  },

  plans: {
    list: (clientId: string) =>
      request<{ items: (T.PlanSummary & { clientId: string })[] }>(
        'GET',
        `/v1/clients/${clientId}/meal-plans`,
      ),
    get: (planId: string) => request<T.PlanWithItems>('GET', `/v1/meal-plans/${planId}`),
    generate: (clientId: string, body?: { override?: { reason: string }; mealCount?: 3 | 4 | 5 }) =>
      request<T.PlanWithItems & { generationId: string }>(
        'POST',
        `/v1/clients/${clientId}/meal-plans/generate`,
        body ?? {},
        { idempotent: true },
      ),
    patch: (planId: string, ops: T.PlanOp[]) =>
      request<T.PlanWithItems>('PATCH', `/v1/meal-plans/${planId}`, { ops }),
    publish: (planId: string, body: T.PublishPlanBody) =>
      request<T.PlanSummary>('POST', `/v1/meal-plans/${planId}/publish`, body, {
        idempotent: true,
      }),
    dietPlanPdf: (planId: string): Promise<Blob> =>
      requestBlob(`/v1/meal-plans/${planId}/diet-plan.pdf`),
  },

  notifications: {
    list: () => request<{ items: T.Notification[] }>('GET', '/v1/notifications'),
    unreadCount: () => request<{ count: number }>('GET', '/v1/notifications/unread-count'),
    markRead: (id: string) => request<{ ok: boolean }>('POST', `/v1/notifications/${id}/read`),
    markAllRead: () => request<{ ok: boolean }>('POST', '/v1/notifications/read-all'),
  },
};

export type Api = typeof api;
