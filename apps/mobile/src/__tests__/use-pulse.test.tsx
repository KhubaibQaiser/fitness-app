import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePulse } from '@gymos/app/api';
import { api, type Pulse } from '@gymos/contracts';

/**
 * usePulse (F7.1) with fake timers: the 30 s poll, cleanup on unmount, the pause in the
 * background with an immediate poll on return, and invalidation when the ETag moves.
 * The preset mocks AppState; the hook reads it through use-foreground.native.ts.
 */

const pulse = (etag: string): Pulse => ({
  scope: 'mine',
  unreadCount: 0,
  counts: { redFlags: 0, plansBlocked: 0, overdue: 1, dueToday: 0, drafts: 0 },
  etag,
});

let appStateListener: ((state: AppStateStatus) => void) | undefined;
const setAppState = async (state: AppStateStatus) => {
  Object.assign(AppState, { currentState: state });
  await act(() => appStateListener?.(state));
};

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

// RNTL 14 (U3): renderHook, act and unmount are async.
const mount = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, ...(await renderHook(() => usePulse(), { wrapper })) };
};

beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(AppState, { currentState: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return {
      remove: () => {
        appStateListener = undefined;
      },
    };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  appStateListener = undefined;
});

describe('usePulse', () => {
  it('polls every 30 s with the last ETag and stops when unmounted', async () => {
    const poll = jest.spyOn(api, 'pulse').mockResolvedValue(pulse('"a"'));
    const { result, unmount } = await mount();
    await advance(0);
    expect(poll).toHaveBeenCalledTimes(1);
    expect(poll).toHaveBeenLastCalledWith(undefined, undefined);
    await waitFor(() => expect(result.current.data?.pulse.etag).toBe('"a"'));
    const firstAt = result.current.dataUpdatedAt;

    await advance(29_000);
    expect(poll).toHaveBeenCalledTimes(1);
    await advance(1_000);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenLastCalledWith('"a"', undefined);
    // Once the second poll has rendered, the third is scheduled; unmounting must clear it.
    await waitFor(() => expect(result.current.dataUpdatedAt).toBeGreaterThan(firstAt));

    await unmount();
    expect(appStateListener).toBeUndefined();
    await advance(10 * 60_000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('pauses in the background, polls at once on return, then backs off while idle', async () => {
    const poll = jest.spyOn(api, 'pulse').mockResolvedValue(pulse('"a"'));
    await mount();
    await advance(0);
    expect(poll).toHaveBeenCalledTimes(1);

    await setAppState('background');
    await advance(6 * 60_000);
    expect(poll).toHaveBeenCalledTimes(1);

    await setAppState('active');
    await advance(0);
    expect(poll).toHaveBeenCalledTimes(2);

    // Nothing has changed for over five minutes, so the next poll is 2 min away, not 30 s.
    await advance(30_000);
    expect(poll).toHaveBeenCalledTimes(2);
    await advance(90_000);
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it('invalidates what the pulse summarises when the ETag moves, and not on a 304', async () => {
    const poll = jest
      .spyOn(api, 'pulse')
      .mockResolvedValueOnce(pulse('"a"'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pulse('"b"'));
    const { invalidate, result } = await mount();
    await advance(0);
    await waitFor(() => expect(result.current.data?.pulse.etag).toBe('"a"'));
    await advance(30_000);
    expect(poll).toHaveBeenCalledTimes(2);
    // React Query renders a settled poll a tick later; waitFor steps the fake clock 50 ms at a time.
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data?.pulse.etag).toBe('"a"');
    expect(invalidate).not.toHaveBeenCalled();

    await advance(30_000);
    expect(poll).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(result.current.data?.pulse.etag).toBe('"b"'));
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ['today'],
      ['notifications'],
      ['check-ins', 'due'],
      ['clients'],
    ]);
  });
});
