import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { nowIso, schema as s, type Db, type DbOrTx } from '@gymos/db';

/** Refresh token TTL — 30 days, aligned with the old gate cookie. */
export const REFRESH_TTL_DAYS = 30;

export type SessionMeta = {
  userAgent?: string | undefined;
  ip?: string | undefined;
};

export type CreatedSession = {
  sessionId: string;
  /** Raw refresh token — return once to the client; never log or store plaintext. */
  refreshToken: string;
  expiresAt: string;
};

const hashRefreshToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('base64url');

const newRawRefreshToken = (): string => randomBytes(32).toString('base64url');

export const createSession = async (
  db: DbOrTx,
  userId: string,
  meta: SessionMeta = {},
): Promise<CreatedSession> => {
  const refreshToken = newRawRefreshToken();
  const expiresAt = DateTime.utc().plus({ days: REFRESH_TTL_DAYS }).toISO();
  if (typeof expiresAt !== 'string') throw new Error('failed to compute session expiry');

  const [row] = await db
    .insert(s.sessions)
    .values({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      lastUsedAt: nowIso(),
    })
    .returning({ id: s.sessions.id });
  if (!row) throw new Error('session insert failed');

  return { sessionId: row.id, refreshToken, expiresAt };
};

export type LookedUpSession = {
  sessionId: string;
  userId: string;
  expiresAt: string;
};

/** Find an active (non-revoked, non-expired) session by raw refresh token. */
export const findActiveSession = async (
  db: Db,
  refreshToken: string,
): Promise<LookedUpSession | null> => {
  const hash = hashRefreshToken(refreshToken);
  const now = nowIso();
  const [row] = await db
    .select({
      sessionId: s.sessions.id,
      userId: s.sessions.userId,
      expiresAt: s.sessions.expiresAt,
    })
    .from(s.sessions)
    .where(
      and(
        eq(s.sessions.refreshTokenHash, hash),
        isNull(s.sessions.revokedAt),
        gt(s.sessions.expiresAt, now),
      ),
    )
    .limit(1);
  return row ?? null;
};

/** Rotate: revoke the old session and issue a new refresh token for the same user. */
export const rotateSession = async (
  db: Db,
  current: LookedUpSession,
  meta: SessionMeta = {},
): Promise<CreatedSession> => {
  await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(eq(s.sessions.id, current.sessionId));
  return createSession(db, current.userId, meta);
};

export const revokeSession = async (db: Db, sessionId: string): Promise<void> => {
  await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(s.sessions.id, sessionId), isNull(s.sessions.revokedAt)));
};

export const revokeSessionByRefreshToken = async (db: Db, refreshToken: string): Promise<void> => {
  const hash = hashRefreshToken(refreshToken);
  await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(s.sessions.refreshTokenHash, hash), isNull(s.sessions.revokedAt)));
};

/** Log out everywhere — revoke all active sessions for a user. */
export const revokeAllSessionsForUser = async (db: Db, userId: string): Promise<number> => {
  const rows = await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(s.sessions.userId, userId), isNull(s.sessions.revokedAt)))
    .returning({ id: s.sessions.id });
  return rows.length;
};

export const touchSession = async (db: Db, sessionId: string): Promise<void> => {
  await db.update(s.sessions).set({ lastUsedAt: nowIso() }).where(eq(s.sessions.id, sessionId));
};
