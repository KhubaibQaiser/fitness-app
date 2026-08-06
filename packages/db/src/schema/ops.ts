import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { notificationPriorityEnum, notificationTypeEnum } from './enums';
import { createdAt, id, tstz } from './helpers';
import { clients, users } from './tenancy';

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id),
    type: notificationTypeEnum('type').notNull(),
    priority: notificationPriorityEnum('priority').notNull().default('NORMAL'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    deepLink: text('deep_link'),
    readAt: tstz('read_at'),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_recipient_idx').on(t.recipientUserId, t.readAt, t.createdAt.desc())],
);

/** Attention-engine read model — drives roster sorting and the Home screen. */
export const clientAttention = pgTable('client_attention', {
  clientId: uuid('client_id')
    .primaryKey()
    .references(() => clients.id),
  score: integer('score').notNull().default(0),
  /** [{ code, weight, since }] — rendered as roster badges. */
  reasons: jsonb('reasons').$type<{ code: string; weight: number; since: string }[]>().notNull(),
  computedAt: tstz('computed_at').notNull(),
});

/** Every sensitive mutation lands here — money, membership, permission, health data. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_resource_idx').on(t.resourceType, t.resourceId, t.createdAt.desc())],
);

/** Idempotency-Key replay store (24h TTL enforced by the maintenance job). */
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  responseStatus: smallint('response_status').notNull(),
  responseBody: jsonb('response_body').$type<unknown>(),
  createdAt: createdAt(),
  expiresAt: tstz('expires_at').notNull(),
});

/** Access-gate telemetry — feeds the gate-bruteforce alert. */
export const accessGateAttempts = pgTable(
  'access_gate_attempts',
  {
    id: id(),
    ip: inet('ip'),
    success: boolean('success').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('access_gate_attempts_time_idx').on(t.createdAt.desc())],
);
