import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema as s, type Db } from '@gymos/db';

export type NotificationType =
  | 'CHECKIN_DUE'
  | 'CHECKIN_OVERDUE'
  | 'OFF_TRACK'
  | 'RED_FLAG'
  | 'PLAN_NEEDS_REVIEW'
  | 'PLAN_PUBLISHED'
  | 'MILESTONE'
  | 'SYSTEM';

export const notify = async (
  db: Db,
  input: {
    recipientUserId: string;
    type: NotificationType;
    priority?: 'HIGH' | 'NORMAL';
    payload: Record<string, unknown>;
    deepLink?: string;
  },
): Promise<void> => {
  await db.insert(s.notifications).values({
    recipientUserId: input.recipientUserId,
    type: input.type,
    priority: input.priority ?? 'NORMAL',
    payload: input.payload,
    deepLink: input.deepLink ?? null,
  });
};

export const listNotifications = async (db: Db, userId: string, limit = 50) =>
  db
    .select()
    .from(s.notifications)
    .where(eq(s.notifications.recipientUserId, userId))
    .orderBy(desc(s.notifications.createdAt))
    .limit(limit);

export const unreadCount = async (db: Db, userId: string): Promise<number> => {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.notifications)
    .where(and(eq(s.notifications.recipientUserId, userId), isNull(s.notifications.readAt)));
  return row?.n ?? 0;
};

export const markRead = async (db: Db, userId: string, notificationId: string): Promise<void> => {
  await db
    .update(s.notifications)
    .set({ readAt: sql`now()` })
    .where(
      and(eq(s.notifications.id, notificationId), eq(s.notifications.recipientUserId, userId)),
    );
};

export const markAllRead = async (db: Db, userId: string): Promise<void> => {
  await db
    .update(s.notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(s.notifications.recipientUserId, userId), isNull(s.notifications.readAt)));
};
