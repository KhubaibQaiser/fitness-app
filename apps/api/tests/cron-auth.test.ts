import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Db } from '@gymos/db';
import { tenantManifestSchema } from '@gymos/modules/tenancy';
import { buildApp } from '../src/app';

const { runNightly } = vi.hoisted(() => ({ runNightly: vi.fn() }));
vi.mock('@gymos/modules/maintenance', () => ({ runNightly }));

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);
const SECRET = 'cron-secret-at-least-16-chars';

const app = (cronSecret?: string) =>
  buildApp({
    db: {} as Db,
    manifest,
    env: {
      JWT_ACCESS_SECRET: 'a-test-jwt-access-secret-that-is-long-enough',
      AI_MODE: 'fallback',
      TENANT_TIMEZONE: 'Asia/Karachi',
      ...(cronSecret === undefined ? {} : { CRON_SECRET: cronSecret }),
    },
  });

const call = (a: ReturnType<typeof app>, authorization?: string) =>
  a.request('/internal/cron/nightly', {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
  });

describe('GET /internal/cron/nightly', () => {
  beforeEach(() => runNightly.mockReset());

  it('is 404 and runs nothing when CRON_SECRET is unset', async () => {
    const res = await call(app(), `Bearer ${SECRET}`);
    expect(res.status).toBe(404);
    expect(runNightly).not.toHaveBeenCalled();
  });

  it('is 401 and runs nothing for a missing or wrong secret', async () => {
    const a = app(SECRET);
    expect((await call(a)).status).toBe(401);
    expect((await call(a, 'Bearer nope')).status).toBe(401);
    expect(runNightly).not.toHaveBeenCalled();
  });

  it('runs the jobs for a valid secret and returns 200', async () => {
    runNightly.mockResolvedValue([{ job: 'cleanup', ok: true }]);
    const res = await call(app(SECRET), `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [{ job: 'cleanup', ok: true }] });
    expect(runNightly).toHaveBeenCalledWith(expect.anything(), 'Asia/Karachi');
  });

  it('returns 500 with the per-job results when a job failed', async () => {
    runNightly.mockResolvedValue([
      { job: 'checkins-roll', ok: false, error: 'boom' },
      { job: 'cleanup', ok: true },
    ]);
    const res = await call(app(SECRET), `Bearer ${SECRET}`);
    expect(res.status).toBe(500);
    expect(((await res.json()) as { results: unknown[] }).results).toHaveLength(2);
  });
});
