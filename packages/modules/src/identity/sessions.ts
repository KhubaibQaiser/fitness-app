import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { dbTimestampToMillis, newId, nowIso, schema as s, type Db, type DbOrTx } from '@gymos/db';

/** Refresh token TTL — 30 days. */
export const REFRESH_TTL_DAYS = 30;

/**
 * Window after a token is rotated during which reusing the *old* token is
 * treated as a benign race (concurrent requests, retried request, a second
 * tab) rather than theft. Reuse outside this window revokes the whole session
 * family — see `rotateSessionByToken`.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

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

/**
 * Create a new refresh session. `familyId` ties rotated sessions together —
 * omit it for a brand-new login (the session becomes its own family root).
 */
export const createSession = async (
  db: DbOrTx,
  userId: string,
  meta: SessionMeta = {},
  familyId?: string,
): Promise<CreatedSession> => {
  const refreshToken = newRawRefreshToken();
  const expiresAt = DateTime.utc().plus({ days: REFRESH_TTL_DAYS }).toISO();
  if (typeof expiresAt !== 'string') throw new Error('failed to compute session expiry');
  const sessionId = newId();

  const [row] = await db
    .insert(s.sessions)
    .values({
      id: sessionId,
      familyId: familyId ?? sessionId,
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

export type RotateOutcome =
  | { kind: 'rotated'; userId: string; session: CreatedSession }
  | { kind: 'reuse-grace'; userId: string }
  | { kind: 'reuse-detected'; userId: string }
  | { kind: 'invalid' };

/**
 * Rotate a refresh token: atomically revoke it and issue a new one in the
 * same session family.
 *
 * Handles the two ways concurrent refresh calls with the *same* stale token
 * can arrive (racing requests from one client, or two tabs/devices):
 * - The revoke-if-still-live update is a single conditional `UPDATE ... WHERE
 *   revoked_at IS NULL`, so only one of N racing callers can ever win it.
 * - Losers, and anyone reusing a token rotated within `REFRESH_REUSE_GRACE_MS`,
 *   get `reuse-grace` — no new tokens, but the session family stays alive so
 *   the user isn't logged out for losing a benign race.
 * - Reuse of a token rotated *longer* ago than the grace window revokes the
 *   entire family (real reuse/theft signal) and forces re-login.
 */
export const rotateSessionByToken = async (
  db: Db,
  refreshToken: string,
  meta: SessionMeta = {},
): Promise<RotateOutcome> => {
  const hash = hashRefreshToken(refreshToken);
  const now = nowIso();

  const [row] = await db
    .select({
      sessionId: s.sessions.id,
      familyId: s.sessions.familyId,
      userId: s.sessions.userId,
      expiresAt: s.sessions.expiresAt,
      revokedAt: s.sessions.revokedAt,
    })
    .from(s.sessions)
    .where(eq(s.sessions.refreshTokenHash, hash))
    .limit(1);

  if (!row) return { kind: 'invalid' };
  if (dbTimestampToMillis(row.expiresAt) <= Date.now()) return { kind: 'invalid' };

  if (row.revokedAt === null) {
    const updated = await db
      .update(s.sessions)
      .set({ revokedAt: now })
      .where(and(eq(s.sessions.id, row.sessionId), isNull(s.sessions.revokedAt)))
      .returning({ id: s.sessions.id });

    if (updated.length === 0) {
      // Lost the atomic race to revoke — a sibling request rotated it first.
      return { kind: 'reuse-grace', userId: row.userId };
    }

    const session = await createSession(db, row.userId, meta, row.familyId);
    return { kind: 'rotated', userId: row.userId, session };
  }

  const revokedMsAgo = Date.now() - dbTimestampToMillis(row.revokedAt);
  if (revokedMsAgo <= REFRESH_REUSE_GRACE_MS) {
    return { kind: 'reuse-grace', userId: row.userId };
  }

  await db
    .update(s.sessions)
    .set({ revokedAt: now })
    .where(and(eq(s.sessions.familyId, row.familyId), isNull(s.sessions.revokedAt)));
  return { kind: 'reuse-detected', userId: row.userId };
};

export const revokeSession = async (db: Db, sessionId: string): Promise<void> => {
  await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(s.sessions.id, sessionId), isNull(s.sessions.revokedAt)));
};

/**
 * Current-device logout: look up the presented refresh token, then revoke every
 * live row in that session family so rotated `sid`s cannot keep serving access JWTs.
 */
export const revokeSessionByRefreshToken = async (db: Db, refreshToken: string): Promise<void> => {
  const hash = hashRefreshToken(refreshToken);
  const [row] = await db
    .select({ familyId: s.sessions.familyId })
    .from(s.sessions)
    .where(eq(s.sessions.refreshTokenHash, hash))
    .limit(1);
  if (!row) return;
  await db
    .update(s.sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(s.sessions.familyId, row.familyId), isNull(s.sessions.revokedAt)));
};

/**
 * Access JWT is accepted only while this session row is live and belongs to `userId`.
 * Signature validity is not enough — logout must take effect before JWT expiry.
 */
export const isSessionActive = async (
  db: Db,
  input: { sessionId: string; userId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({
      userId: s.sessions.userId,
      revokedAt: s.sessions.revokedAt,
      expiresAt: s.sessions.expiresAt,
    })
    .from(s.sessions)
    .where(eq(s.sessions.id, input.sessionId))
    .limit(1);
  if (!row) return false;
  if (row.userId !== input.userId) return false;
  if (row.revokedAt !== null) return false;
  if (dbTimestampToMillis(row.expiresAt) <= Date.now()) return false;
  return true;
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
