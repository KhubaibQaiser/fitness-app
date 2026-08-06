import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api, type PlanOp, type Restriction } from '@gymos/contracts';

/** Query-key factory — the single vocabulary for cache identity. */
export const qk = {
  me: ['me'] as const,
  config: ['config'] as const,
  clients: (q?: string) => ['clients', q ?? ''] as const,
  clientDetail: (id: string) => ['clients', 'detail', id] as const,
  vitals: (clientId: string) => ['vitals', clientId] as const,
  dietary: (clientId: string) => ['dietary', clientId] as const,
  goals: (clientId: string) => ['goals', clientId] as const,
  dueCheckIns: ['check-ins', 'due'] as const,
  clientCheckIns: (clientId: string) => ['check-ins', clientId] as const,
  plans: (clientId: string) => ['plans', clientId] as const,
  plan: (planId: string) => ['plan', planId] as const,
  foods: (q?: string) => ['foods', q ?? ''] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
};

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.me, staleTime: 60_000 });

export const usePublicConfig = () =>
  useQuery({ queryKey: qk.config, queryFn: api.publicConfig, staleTime: 300_000 });

export const useClients = (q?: string) =>
  useQuery({ queryKey: qk.clients(q), queryFn: () => api.clients.list(q) });

export const useClientDetail = (clientId: string) =>
  useQuery({ queryKey: qk.clientDetail(clientId), queryFn: () => api.clients.detail(clientId) });

export const useVitals = (clientId: string) =>
  useQuery({ queryKey: qk.vitals(clientId), queryFn: () => api.vitals.list(clientId) });

export const useDueCheckIns = () =>
  useQuery({ queryKey: qk.dueCheckIns, queryFn: api.checkIns.due, refetchInterval: 60_000 });

export const useClientCheckIns = (clientId: string) =>
  useQuery({
    queryKey: qk.clientCheckIns(clientId),
    queryFn: () => api.checkIns.forClient(clientId),
  });

export const usePlan = (planId: string | null) =>
  useQuery({
    queryKey: qk.plan(planId ?? 'none'),
    queryFn: () => api.plans.get(planId ?? ''),
    enabled: planId !== null,
  });

export const useFoods = (q?: string) =>
  useQuery({ queryKey: qk.foods(q), queryFn: () => api.foods.list(q), staleTime: 300_000 });

export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list });

export const useUnreadCount = () =>
  useQuery({
    queryKey: qk.unread,
    queryFn: api.notifications.unreadCount,
    refetchInterval: 30_000,
  });

const invalidateClient = (queryClient: ReturnType<typeof useQueryClient>, clientId: string) => {
  void queryClient.invalidateQueries({ queryKey: qk.clientDetail(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.clients() });
  void queryClient.invalidateQueries({ queryKey: qk.vitals(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.plans(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.clientCheckIns(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.dueCheckIns });
  void queryClient.invalidateQueries({ queryKey: qk.unread });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.clients.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.clients() }),
  });
};

export const useRecordVitals = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, number | string | undefined>) =>
      api.vitals.record(clientId, input),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const usePutDietary = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restrictions: Restriction[]) => api.dietary.put(clientId, restrictions),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const useCreateGoal = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.goals.create>[1]) =>
      api.goals.create(clientId, input),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const useCompleteCheckIn = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.checkIns.complete>[1]) =>
      api.checkIns.complete(clientId, input),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const useApplyAdjustment = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkInId: string) => api.checkIns.apply(checkInId),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const useGeneratePlan = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (override?: { reason: string }) => api.plans.generate(clientId, override),
    onSuccess: () => invalidateClient(queryClient, clientId),
  });
};

export const usePatchPlan = (planId: string, clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ops: PlanOp[]) => api.plans.patch(planId, ops),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.plan(planId), data);
      invalidateClient(queryClient, clientId);
    },
  });
};

export const usePublishPlan = (planId: string, clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.plans.publish(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.plan(planId) });
      invalidateClient(queryClient, clientId);
    },
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
      void queryClient.invalidateQueries({ queryKey: qk.unread });
    },
  });
};

export type Mutation<TData, TVars> = UseMutationResult<TData, Error, TVars>;
export type Query<TData> = UseQueryResult<TData>;
