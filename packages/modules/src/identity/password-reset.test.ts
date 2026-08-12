import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { loginWithPassword } from './login';
import { createMemoryEmailSender } from './mail';
import { hashPassword } from './password';
import { requestPasswordReset, resetPasswordWithOtp } from './password-reset';
import { createSession } from './sessions';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

const pepper = 'test-otp-pepper-at-least-32-characters!!';
const COACH_PASSWORD = 'pilot-coach-test-password';

let db: Db;
let coachUserId: string;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  const seeded = await seed(db, { coachPasswordHash: await hashPassword(COACH_PASSWORD) });
  coachUserId = seeded.coachUserId;
});

describe('password reset', () => {
  it('is a no-op for unknown emails', async () => {
    const mail = createMemoryEmailSender();
    await requestPasswordReset(db, { pepper, mail }, 'nobody@example.com');
    expect(mail.sent).toHaveLength(0);
  });

  it('resets password and revokes sessions', async () => {
    const mail = createMemoryEmailSender();
    await createSession(db, coachUserId);
    await requestPasswordReset(db, { pepper, mail }, 'coach@pilot.local');
    expect(mail.sent).toHaveLength(1);
    const sentCode = mail.sent[0]?.code;
    expect(sentCode).toMatch(/^\d{6}$/);
    if (sentCode === undefined) return;

    const reset = await resetPasswordWithOtp(
      db,
      { pepper },
      {
        email: 'coach@pilot.local',
        code: sentCode,
        newPassword: 'brand-new-password-99',
      },
    );
    expect(reset.ok).toBe(true);

    const active = await db
      .select({ id: s.sessions.id })
      .from(s.sessions)
      .where(and(eq(s.sessions.userId, coachUserId), isNull(s.sessions.revokedAt)));
    expect(active).toHaveLength(0);

    const login = await loginWithPassword(db, 'coach@pilot.local', 'brand-new-password-99');
    expect(login.ok).toBe(true);
  });
});
