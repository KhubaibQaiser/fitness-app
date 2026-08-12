import { isNull } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { notificationPriorityEnum, notificationTypeEnum, otpPurposeEnum } from './enums';
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

/** Shared-store fixed-window rate limiter (multi-instance safe). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: tstz('window_start').notNull(),
  count: integer('count').notNull().default(1),
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

/**
 * Email OTP challenges for coach signup and password reset.
 * Raw codes are never stored — only SHA-256(code + pepper).
 */
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: id(),
    purpose: otpPurposeEnum('purpose').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    codeHash: text('code_hash').notNull(),
    /** Signup stashes `{ name, passwordHash, joinCode?, timezone? }` after hashing the password. */
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    expiresAt: tstz('expires_at').notNull(),
    consumedAt: tstz('consumed_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('otp_challenges_email_purpose_idx').on(t.email, t.purpose),
    index('otp_challenges_active_idx')
      .on(t.email, t.purpose, t.expiresAt)
      .where(isNull(t.consumedAt)),
  ],
);

/**
 * Refresh-token sessions — one row per device/login.
 * The raw refresh token is returned once to the client; only a SHA-256 hash is stored.
 * Rotation: each refresh revokes the old row and inserts a new one.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: tstz('expires_at').notNull(),
    revokedAt: tstz('revoked_at'),
    userAgent: text('user_agent'),
    ip: inet('ip'),
    createdAt: createdAt(),
    lastUsedAt: tstz('last_used_at').notNull().defaultNow(),
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    uniqueIndex('sessions_refresh_hash_uq').on(t.refreshTokenHash),
    index('sessions_expires_idx').on(t.expiresAt),
  ],
);
