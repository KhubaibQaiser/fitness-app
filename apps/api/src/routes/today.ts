import { createHash } from 'node:crypto';
import { createRoute, z } from '@hono/zod-openapi';
import { getTodayQueue, resolveClientScope, type ClientScopeChoice } from '@gymos/modules/coaching';
import { unreadCount } from '@gymos/modules/notifications';
import { json, problemDocs, type AppContext, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

/** If-None-Match matches with the weak comparison (RFC 9110 §13.1.2), so `W/` is ignored. */
export const etagMatches = (ifNoneMatch: string | undefined, etag: string): boolean =>
  ifNoneMatch?.split(',').some((raw) => {
    const tag = raw.trim();
    return tag === '*' || tag.replace(/^W\//, '') === etag;
  }) === true;

const etagHeader = { etag: z.string().openapi({ description: 'Strong ETag of the pulse' }) };

export const registerTodayRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db } = bind;
  /** The queue for the requested scope (resolveClientScope's default when absent). */
  const queueFor = async (c: AppContext, requested: ClientScopeChoice | undefined) => {
    const scope = resolveClientScope(c.get('principal'), requested);
    if (!scope.ok) {
      throw new ProblemError(403, 'COACH_REQUIRED', 'My clients needs a coach account');
    }
    const queue = await getTodayQueue(db, { scope: scope.value });
    return { scope: scope.value.choice, ...queue };
  };

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/today',
      operationId: 'getToday',
      request: { query: dto.clientScopeQuery },
      responses: {
        200: { description: 'The grouped work queue for the scope', ...json(dto.todayResponse) },
        ...problemDocs(403, 422),
      },
    }),
    async (c) => c.json(await queueFor(c, c.req.valid('query').scope), 200),
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/pulse',
      operationId: 'getPulse',
      request: {
        query: dto.clientScopeQuery,
        headers: z.object({ 'if-none-match': z.string().optional() }),
      },
      responses: {
        200: {
          description: 'Unread count and Today counts',
          headers: z.object(etagHeader),
          ...json(dto.pulseResponse),
        },
        304: { description: 'Nothing changed since If-None-Match', headers: z.object(etagHeader) },
        ...problemDocs(403, 422),
      },
    }),
    async (c) => {
      const [queue, unread] = await Promise.all([
        queueFor(c, c.req.valid('query').scope),
        unreadCount(db, c.get('principal').userId),
      ]);
      // Hash the whole queue and its scope, not just the counts, so a swap of items at equal
      // counts or a switch of scope still changes the tag. ponytail: an unread notification
      // swapped for another within one poll keeps the count and the tag; add the newest
      // notification id if the Inbox needs that.
      const digest = createHash('sha256')
        .update(JSON.stringify({ unread, queue }))
        .digest('base64url');
      const etag = `"${digest.slice(0, 27)}"`;
      c.header('etag', etag);
      c.header('cache-control', 'private, no-cache');
      if (etagMatches(c.req.valid('header')['if-none-match'], etag)) return c.body(null, 304);
      return c.json({ scope: queue.scope, unreadCount: unread, counts: queue.counts, etag }, 200);
    },
  );
};
