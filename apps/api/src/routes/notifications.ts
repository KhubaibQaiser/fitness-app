import { createRoute, z } from '@hono/zod-openapi';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '@gymos/modules/notifications';
import { json, type GymosApp } from '../http';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerNotificationRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, authorize } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/notifications',
      operationId: 'listNotifications',
      responses: { 200: { description: 'Notifications (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      authorize(c, 'notification.read', { ownerUserId: c.get('principal').userId });
      return c.json({ items: await listNotifications(db, c.get('principal').userId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/notifications/unread-count',
      operationId: 'unreadCount',
      responses: {
        200: { description: 'Unread count', ...json(z.object({ count: z.number() })) },
      },
    }),
    async (c) => c.json({ count: await unreadCount(db, c.get('principal').userId) }),
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/notifications/{id}/read',
      operationId: 'markNotificationRead',
      request: { params: dto.idParam },
      responses: { 200: { description: 'Marked', ...json(dto.okResponse) } },
    }),
    async (c) => {
      await markRead(db, c.get('principal').userId, c.req.valid('param').id);
      return c.json({ ok: true });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/notifications/read-all',
      operationId: 'markAllNotificationsRead',
      responses: { 200: { description: 'Marked', ...json(dto.okResponse) } },
    }),
    async (c) => {
      await markAllRead(db, c.get('principal').userId);
      return c.json({ ok: true });
    },
  );
};
