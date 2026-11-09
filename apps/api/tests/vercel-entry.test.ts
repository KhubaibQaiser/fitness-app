import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const close = vi.fn(() => Promise.resolve());
const createDb = vi.fn(() => ({ db: {}, close }));
vi.mock('@gymos/db', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createDb,
}));
vi.mock('@gymos/modules/tenancy', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  syncSingleOrgRegistryFromFile: () => Promise.resolve(),
}));

describe('Vercel entry (ADR-0016)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://x:x@localhost:5432/x';
    process.env.JWT_ACCESS_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
    process.env.TENANT_MANIFEST_PATH = path.resolve(
      import.meta.dirname,
      '../../../infra/tenants/pilot.json',
    );
  });

  it('serves /health/live through the exported handlers with the original path', async () => {
    const { GET, POST } = await import('../api/index');
    const res = await GET(new Request('https://api.example.test/health/live'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'live' });
    expect(POST).toBeTypeOf('function');
    // Neon's pooler is transaction-mode: prepared statements must be off, pool tiny.
    expect(createDb).toHaveBeenCalledWith(expect.any(String), 1, { prepare: false });
  });
});
