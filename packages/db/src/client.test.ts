import { describe, expect, it } from 'vitest';
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
