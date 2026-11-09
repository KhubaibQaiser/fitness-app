/**
 * Run `init` once and share the result; a failed init is retried by the next
 * caller. Serverless cold starts build the app through this so concurrent
 * first requests never build it twice (ADR-0016).
 */
export const memoizeAsync = <T>(init: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= init().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
};
