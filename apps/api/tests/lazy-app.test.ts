import { describe, expect, it } from 'vitest';
import { memoizeAsync } from '../src/lazy-app';

describe('memoizeAsync', () => {
  it('runs init once for concurrent first callers', async () => {
    let calls = 0;
    const get = memoizeAsync(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return { n: calls };
    });
    const [a, b, c] = await Promise.all([get(), get(), get()]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('retries after a failed init instead of caching the failure', async () => {
    let calls = 0;
    const get = memoizeAsync(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('cold start failed')) : Promise.resolve('ok');
    });
    await expect(get()).rejects.toThrow('cold start failed');
    await expect(get()).resolves.toBe('ok');
    expect(calls).toBe(2);
  });
});
