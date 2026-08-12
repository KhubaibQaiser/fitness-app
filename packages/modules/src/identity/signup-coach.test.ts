import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { createMemoryEmailSender } from './mail';
import { hashPassword } from './password';
import { confirmCoachSignup, startCoachSignup } from './signup-coach';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

const pepper = 'test-otp-pepper-at-least-32-characters!!';

let db: Db;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  await seed(db, { coachPasswordHash: await hashPassword('pilot-coach-test-password') });
});

describe('coach signup', () => {
  it('provisions a new tenant and issues a session', async () => {
    const mail = createMemoryEmailSender();
    const start = await startCoachSignup(
      db,
      { pepper, mail },
      {
        name: 'Ayesha Coach',
        email: 'ayesha@example.com',
        phone: '03001112233',
        password: 'strong-password-1',
      },
    );
    expect(start.ok).toBe(true);
    expect(mail.sent).toHaveLength(1);
    const sentCode = mail.sent[0]?.code;
    expect(sentCode).toMatch(/^\d{6}$/);
    if (sentCode === undefined) return;

    const confirmed = await confirmCoachSignup(
      db,
      { pepper },
      {
        email: 'ayesha@example.com',
        code: sentCode,
      },
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const [user] = await db.select().from(s.users).where(eq(s.users.id, confirmed.value.userId));
    expect(user?.emailVerifiedAt).toBeTruthy();
    expect(user?.phone).toBe('+923001112233');

    const memberships = await db
      .select({ role: s.memberships.role })
      .from(s.memberships)
      .where(eq(s.memberships.userId, confirmed.value.userId));
    expect(memberships.map((m) => m.role).sort()).toEqual(['COACH', 'ORG_ADMIN']);
  });

  it('rejects duplicate email', async () => {
    const mail = createMemoryEmailSender();
    const start = await startCoachSignup(
      db,
      { pepper, mail },
      {
        name: 'Dup',
        email: 'coach@pilot.local',
        phone: '03009998877',
        password: 'strong-password-1',
      },
    );
    expect(start.ok).toBe(false);
    if (!start.ok) expect(start.error.reason).toBe('EMAIL_TAKEN');
  });

  it('joins an existing org via join code', async () => {
    const mail = createMemoryEmailSender();
    const start = await startCoachSignup(
      db,
      { pepper, mail },
      {
        name: 'Joiner',
        email: 'joiner@example.com',
        phone: '03005556677',
        password: 'strong-password-1',
        joinCode: 'PILOT001',
      },
    );
    expect(start.ok).toBe(true);
    const sentCode = mail.sent[0]?.code;
    expect(sentCode).toMatch(/^\d{6}$/);
    if (sentCode === undefined) return;
    const confirmed = await confirmCoachSignup(
      db,
      { pepper },
      {
        email: 'joiner@example.com',
        code: sentCode,
      },
    );
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const memberships = await db
      .select({ role: s.memberships.role })
      .from(s.memberships)
      .where(eq(s.memberships.userId, confirmed.value.userId));
    expect(memberships.map((m) => m.role)).toEqual(['COACH']);
  });
});
