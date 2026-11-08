import { createHash, timingSafeEqual } from 'node:crypto';
import { runNightly } from '@gymos/modules/maintenance';
import { type GymosApp } from '../http';
import { problemResponse } from '../problems';
import { type RouteBind } from '../route-bind';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * Nightly maintenance trigger (replaces apps/worker on hosts without a
 * background process, ADR-0016). Plain Hono route: deliberately not in the
 * public OpenAPI document. Not proxied by the web app (only /v1, /gate, /health are).
 */
export const registerCronRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, env } = bind;
  app.get('/internal/cron/nightly', async (c) => {
    const secret = env.CRON_SECRET;
    if (secret === undefined || secret.length === 0) {
      return problemResponse(c, 404, 'NOT_FOUND', 'Not found');
    }
    const given = c.req.header('authorization') ?? '';
    if (!timingSafeEqual(digest(given), digest(`Bearer ${secret}`))) {
      return problemResponse(c, 401, 'UNAUTHORIZED', 'Invalid cron credentials');
    }
    const results = await runNightly(db, env.TENANT_TIMEZONE ?? 'Asia/Karachi');
    return c.json({ results }, results.every((r) => r.ok) ? 200 : 500);
  });
};
