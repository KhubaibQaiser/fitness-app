import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import {
  createSession,
  isSessionActive,
  revokeSessionByRefreshToken,
  rotateSessionByToken,
} from './sessions';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

let db: Db;
let userId: string;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  const result = await seed(db);
  userId = result.coachUserId;
});

describe('rotateSessionByToken', () => {
  it('rotates a live token and keeps the same family id', async () => {
    const created = await createSession(db, userId);
    const outcome = await rotateSessionByToken(db, created.refreshToken);
    expect(outcome.kind).toBe('rotated');
    if (outcome.kind !== 'rotated') return;

    const [oldRow] = await db
      .select({ familyId: s.sessions.familyId, revokedAt: s.sessions.revokedAt })
      .from(s.sessions)
      .where(eq(s.sessions.id, created.sessionId));
    expect(oldRow?.revokedAt).not.toBeNull();

    const [newRow] = await db
      .select({ familyId: s.sessions.familyId })
      .from(s.sessions)
      .where(eq(s.sessions.id, outcome.session.sessionId));
    expect(newRow?.familyId).toBe(oldRow?.familyId);
  });

  it('treats concurrent rotation of the same token as a benign race, not a lockout', async () => {
    const created = await createSession(db, userId);

    const [first, second] = await Promise.all([
      rotateSessionByToken(db, created.refreshToken),
      rotateSessionByToken(db, created.refreshToken),
    ]);

    const kinds = [first.kind, second.kind].sort();
    expect(kinds).toEqual(['reuse-grace', 'rotated']);

    // The family must still be usable — the winner's new token keeps working.
    const winner = first.kind === 'rotated' ? first : second;
    if (winner.kind !== 'rotated') throw new Error('expected one rotation to win');
    const again = await rotateSessionByToken(db, winner.session.refreshToken);
    expect(again.kind).toBe('rotated');
  });

  it('revokes the whole session family on reuse outside the grace window', async () => {
    const created = await createSession(db, userId);
    const rotated = await rotateSessionByToken(db, created.refreshToken);
    expect(rotated.kind).toBe('rotated');
    if (rotated.kind !== 'rotated') return;

    // Simulate the grace window having elapsed since the first rotation.
    await db
      .update(s.sessions)
      .set({ revokedAt: new Date(Date.now() - 60_000).toISOString() })
      .where(eq(s.sessions.id, created.sessionId));

    const reused = await rotateSessionByToken(db, created.refreshToken);
    expect(reused.kind).toBe('reuse-detected');

    // The rotated (newer) session in the family must now be revoked too.
    const [newRow] = await db
      .select({ revokedAt: s.sessions.revokedAt })
      .from(s.sessions)
      .where(eq(s.sessions.id, rotated.session.sessionId));
    expect(newRow?.revokedAt).not.toBeNull();
  });

  it('rejects an unknown or expired token', async () => {
    const outcome = await rotateSessionByToken(db, 'not-a-real-token');
    expect(outcome.kind).toBe('invalid');
  });
});

describe('isSessionActive', () => {
  it('returns true for a live session owned by the user', async () => {
    const created = await createSession(db, userId);
    await expect(isSessionActive(db, { sessionId: created.sessionId, userId })).resolves.toBe(true);
  });

  it('returns false when the session is revoked', async () => {
    const created = await createSession(db, userId);
    await revokeSessionByRefreshToken(db, created.refreshToken);
    await expect(isSessionActive(db, { sessionId: created.sessionId, userId })).resolves.toBe(
      false,
    );
  });

  it('returns false when userId does not match', async () => {
    const created = await createSession(db, userId);
    const [other] = await db
      .insert(s.users)
      .values({ email: 'other-session@pilot.local', name: 'Other' })
      .returning({ id: s.users.id });
    if (!other) throw new Error('other user insert failed');
    await expect(
      isSessionActive(db, { sessionId: created.sessionId, userId: other.id }),
    ).resolves.toBe(false);
  });

  it('returns false when the session has expired', async () => {
    const created = await createSession(db, userId);
    await db
      .update(s.sessions)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(s.sessions.id, created.sessionId));
    await expect(isSessionActive(db, { sessionId: created.sessionId, userId })).resolves.toBe(
      false,
    );
  });

  it('returns false for an unknown session id', async () => {
    await expect(
      isSessionActive(db, { sessionId: '00000000-0000-7000-8000-000000000001', userId }),
    ).resolves.toBe(false);
  });
});

describe('revokeSessionByRefreshToken', () => {
  it('revokes every live row in the session family', async () => {
    const created = await createSession(db, userId);
    const rotated = await rotateSessionByToken(db, created.refreshToken);
    expect(rotated.kind).toBe('rotated');
    if (rotated.kind !== 'rotated') return;

    await revokeSessionByRefreshToken(db, rotated.session.refreshToken);

    await expect(isSessionActive(db, { sessionId: created.sessionId, userId })).resolves.toBe(
      false,
    );
    await expect(
      isSessionActive(db, { sessionId: rotated.session.sessionId, userId }),
    ).resolves.toBe(false);
  });

  it('revokes the live family row even when presented with an already-rotated token', async () => {
    const created = await createSession(db, userId);
    const rotated = await rotateSessionByToken(db, created.refreshToken);
    expect(rotated.kind).toBe('rotated');
    if (rotated.kind !== 'rotated') return;

    await revokeSessionByRefreshToken(db, created.refreshToken);

    await expect(
      isSessionActive(db, { sessionId: rotated.session.sessionId, userId }),
    ).resolves.toBe(false);
  });
});
