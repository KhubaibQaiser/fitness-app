import { createHash } from 'node:crypto';
import { createRoute, z } from '@hono/zod-openapi';
import { getTodayQueue } from '@gymos/modules/coaching';
import { unreadCount } from '@gymos/modules/notifications';
import { json, problemDocs, type AppContext, type GymosApp } from '../http';
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
  const { db, requireCoachId } = bind;
  const queueFor = (c: AppContext) => {
    const principal = c.get('principal');
    return getTodayQueue(db, { coachId: requireCoachId(principal), orgId: principal.orgId });
  };

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/today',
      operationId: 'getToday',
      responses: {
        200: { description: "The coach's grouped work queue", ...json(dto.todayResponse) },
        ...problemDocs(403),
      },
    }),
    async (c) => c.json(await queueFor(c), 200),
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/pulse',
      operationId: 'getPulse',
      request: { headers: z.object({ 'if-none-match': z.string().optional() }) },
      responses: {
        200: {
          description: 'Unread count and Today counts',
          headers: z.object(etagHeader),
          ...json(dto.pulseResponse),
        },
        304: { description: 'Nothing changed since If-None-Match', headers: z.object(etagHeader) },
        ...problemDocs(403),
      },
    }),
    async (c) => {
      const queue = await queueFor(c);
      const unread = await unreadCount(db, c.get('principal').userId);
      // Hash the whole queue, not just the counts, so a swap of items at equal counts still
      // changes the tag. ponytail: an unread notification swapped for another within one poll
      // keeps the count and the tag; add the newest notification id if the Inbox needs that.
      const digest = createHash('sha256')
        .update(JSON.stringify({ unread, queue }))
        .digest('base64url');
      const etag = `"${digest.slice(0, 27)}"`;
      c.header('etag', etag);
      c.header('cache-control', 'private, no-cache');
      if (etagMatches(c.req.valid('header')['if-none-match'], etag)) return c.body(null, 304);
      return c.json({ unreadCount: unread, counts: queue.counts, etag }, 200);
    },
  );
};
