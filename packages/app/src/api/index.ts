import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api, type PlanOp, type Restriction } from '@gymos/contracts';
import { qk } from './query-keys';

export { qk };
export { usePulse } from './use-pulse';

export const useMe = () =>
  useQuery({
    queryKey: qk.me,
    queryFn: api.me.get,
    // Cookie lasts 30d; avoid refetching on every focus / soft nav.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

export const usePublicConfig = () =>
  useQuery({ queryKey: qk.config, queryFn: api.publicConfig, staleTime: 300_000 });

export const useUpdateMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.me.update,
    onSuccess: (data) => {
      queryClient.setQueryData(qk.me, data);
    },
  });
};

export const useMealInstructions = () =>
  useQuery({ queryKey: qk.mealInstructions, queryFn: api.me.mealInstructions.get });

export const useSaveMealInstructions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => api.me.mealInstructions.put(text),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.mealInstructions, { instructions: data.instructions });
    },
  });
};

export const useClients = (q?: string) =>
  useQuery({
    queryKey: qk.clients(q),
    queryFn: () => api.clients.list(q),
    placeholderData: keepPreviousData,
  });

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

export const useCheckIn = (checkInId: string) =>
  useQuery({
    queryKey: qk.checkIn(checkInId),
    queryFn: () => api.checkIns.get(checkInId),
  });

export const usePlan = (planId: string | null) =>
  useQuery({
    queryKey: qk.plan(planId ?? 'none'),
    queryFn: () => api.plans.get(planId ?? ''),
    enabled: planId !== null,
  });

export const useFoods = (q?: string) =>
  useQuery({
    queryKey: qk.foods(q),
    queryFn: () => api.foods.list(q),
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });

export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list });

export const useUnreadCount = () =>
  useQuery({
    queryKey: qk.unread,
    queryFn: api.notifications.unreadCount,
    refetchInterval: 30_000,
  });

/** The coach's Today queue. It doesn't poll: `usePulse` invalidates it when something changes. */
export const useToday = () => useQuery({ queryKey: qk.today, queryFn: api.today });

const invalidateClient = (queryClient: ReturnType<typeof useQueryClient>, clientId: string) => {
  void queryClient.invalidateQueries({ queryKey: qk.clientDetail(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.clients() });
  void queryClient.invalidateQueries({ queryKey: qk.vitals(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.plans(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.clientCheckIns(clientId) });
  void queryClient.invalidateQueries({ queryKey: qk.dueCheckIns });
  void queryClient.invalidateQueries({ queryKey: qk.unread });
  void queryClient.invalidateQueries({ queryKey: qk.today });
  void queryClient.invalidateQueries({ queryKey: qk.pulse });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.clients.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.clients() }),
  });
};

export const useOnboardClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.clients.onboard,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: qk.clients() });
      invalidateClient(queryClient, data.client.id);
    },
  });
};

export const useDownloadCredentialsPdf = (clientId: string) =>
  useMutation({
    mutationFn: () => api.clients.credentialsPdf(clientId),
  });

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

export const useSaveActiveGoal = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.goals.saveActive>[1]) =>
      api.goals.saveActive(clientId, input),
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

export const useUpdateCheckIn = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      checkInId,
      input,
    }: {
      checkInId: string;
      input: Parameters<typeof api.checkIns.update>[1];
    }) => api.checkIns.update(checkInId, input),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: qk.checkIn(vars.checkInId) });
      invalidateClient(queryClient, clientId);
    },
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
    mutationFn: (input?: { reason?: string; mealCount?: 3 | 4 | 5 }) =>
      api.plans.generate(clientId, {
        ...(input?.reason !== undefined ? { override: { reason: input.reason } } : {}),
        ...(input?.mealCount !== undefined ? { mealCount: input.mealCount } : {}),
      }),
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
    mutationFn: (body: { reviewed: true; acknowledgeDrift?: boolean }) =>
      api.plans.publish(planId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.plan(planId) });
      invalidateClient(queryClient, clientId);
    },
  });
};

export const useRegenerateMeal = (planId: string, clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, mealIndex }: { day: number; mealIndex: number }) =>
      api.plans.regenerateMeal(planId, day, mealIndex),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.plan(planId), data);
      invalidateClient(queryClient, clientId);
    },
  });
};

export const useDownloadDietPlanPdf = (planId: string) =>
  useMutation({
    mutationFn: () => api.plans.dietPlanPdf(planId),
  });

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
      void queryClient.invalidateQueries({ queryKey: qk.unread });
      void queryClient.invalidateQueries({ queryKey: qk.pulse });
    },
  });
};

export type Mutation<TData, TVars> = UseMutationResult<TData, Error, TVars>;
export type Query<TData> = UseQueryResult<TData>;
