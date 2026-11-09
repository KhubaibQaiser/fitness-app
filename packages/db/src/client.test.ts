import { describe, expect, it, vi } from 'vitest';
import { runtimeOptions } from './client';

describe('runtimeOptions', () => {
  it('leaves prepared statements at the driver default when unset (Render/VM path)', () => {
    expect(runtimeOptions(4)).not.toHaveProperty('prepare');
    expect(runtimeOptions(4).max).toBe(4);
  });

  it('turns prepared statements off for transaction-mode poolers (Vercel path)', () => {
    expect(runtimeOptions(1, { prepare: false })).toMatchObject({ max: 1, prepare: false });
  });
});

describe('createDb', () => {
  it('passes the runtime options through to postgres.js', async () => {
    vi.resetModules();
    const postgres = vi.fn(() =>
      Object.assign(() => undefined, {
        end: () => Promise.resolve(),
        options: { parsers: {}, serializers: {} },
      }),
    );
    vi.doMock('postgres', () => ({ default: postgres }));
    const { createDb } = await import('./client');
    createDb('postgres://x:x@localhost:5432/x', 1, { prepare: false });
    expect(postgres).toHaveBeenCalledWith(
      'postgres://x:x@localhost:5432/x',
      expect.objectContaining({ max: 1, prepare: false }),
    );
    vi.doUnmock('postgres');
  });
});
