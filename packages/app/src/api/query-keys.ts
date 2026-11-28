import { type ClientScope } from '@gymos/contracts';

/** Query-key factory — the single vocabulary for cache identity. */
export const qk = {
  me: ['me'] as const,
  mealInstructions: ['me', 'meal-instructions'] as const,
  config: ['config'] as const,
  clients: (q?: string) => ['clients', q ?? ''] as const,
  clientDetail: (id: string) => ['clients', 'detail', id] as const,
  vitals: (clientId: string) => ['vitals', clientId] as const,
  dietary: (clientId: string) => ['dietary', clientId] as const,
  goals: (clientId: string) => ['goals', clientId] as const,
  dueCheckIns: ['check-ins', 'due'] as const,
  clientCheckIns: (clientId: string) => ['check-ins', clientId] as const,
  checkIn: (id: string) => ['check-ins', 'one', id] as const,
  plans: (clientId: string) => ['plans', clientId] as const,
  plan: (planId: string) => ['plan', planId] as const,
  foods: (q?: string) => ['foods', q ?? ''] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  /** Per scope; with no scope (the server's default) the key is also the prefix for every scope. */
  today: (scope?: ClientScope) => (scope === undefined ? ['today'] : ['today', scope]),
  pulse: (scope?: ClientScope) => (scope === undefined ? ['pulse'] : ['pulse', scope]),
};
