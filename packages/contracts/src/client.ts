import type * as T from './types';

/**
 * Typed API client — the ONLY http transport feature code may use
 * (raw fetch is lint-banned in packages/app). Same-origin by design:
 * the web app and API share a hostname (Caddy in prod, rewrites in dev).
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

type RequestOptions = { idempotent?: boolean };

const request = async <TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<TResponse> => {
  const headers: Record<string, string> = { 'x-client-version': 'pilot-web' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (options.idempotent === true) headers['idempotency-key'] = uuid();

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as T.Problem | null;
    throw new ApiError(
      response.status,
      problem?.code ?? 'UNKNOWN',
      problem?.title ?? response.statusText,
      problem?.detail,
    );
  }
  return (await response.json()) as TResponse;
};

export const api = {
  enter: (key: string) => request<{ ok: boolean }>('POST', '/gate/enter', { key }),
  publicConfig: () => request<T.PublicConfig>('GET', '/v1/config/public'),
  me: () => request<T.Me>('GET', '/v1/me'),

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
    credentialsPdf: async (clientId: string): Promise<Blob> => {
      const response = await fetch(`/v1/clients/${clientId}/credentials.pdf`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'x-client-version': 'pilot-web' },
      });
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as T.Problem | null;
        throw new ApiError(
          response.status,
          problem?.code ?? 'UNKNOWN',
          problem?.title ?? response.statusText,
          problem?.detail,
        );
      }
      return response.blob();
    },
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
    publish: (planId: string) =>
      request<T.PlanSummary>('POST', `/v1/meal-plans/${planId}/publish`, undefined, {
        idempotent: true,
      }),
  },

  notifications: {
    list: () => request<{ items: T.Notification[] }>('GET', '/v1/notifications'),
    unreadCount: () => request<{ count: number }>('GET', '/v1/notifications/unread-count'),
    markRead: (id: string) => request<{ ok: boolean }>('POST', `/v1/notifications/${id}/read`),
    markAllRead: () => request<{ ok: boolean }>('POST', '/v1/notifications/read-all'),
  },
};

export type Api = typeof api;
