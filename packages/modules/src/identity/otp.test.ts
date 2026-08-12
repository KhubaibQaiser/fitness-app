import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, type Db } from '@gymos/db';
import { createChallenge, verifyAndConsume } from './otp';

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
});

describe('otp challenges', () => {
  it('consumes a valid code once', async () => {
    const created = await createChallenge(
      db,
      { pepper },
      {
        purpose: 'password_reset',
        email: 'otp-once@example.com',
        payload: { userId: 'x' },
      },
    );
    const ok = await verifyAndConsume(
      db,
      { pepper },
      {
        purpose: 'password_reset',
        email: 'otp-once@example.com',
        code: created.code,
      },
    );
    expect(ok.ok).toBe(true);

    const again = await verifyAndConsume(
      db,
      { pepper },
      {
        purpose: 'password_reset',
        email: 'otp-once@example.com',
        code: created.code,
      },
    );
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.reason).toBe('OTP_NOT_FOUND');
  });

  it('rejects wrong codes and locks after max attempts', async () => {
    await createChallenge(
      db,
      { pepper },
      {
        purpose: 'password_reset',
        email: 'otp-lock@example.com',
      },
    );
    for (let i = 0; i < 4; i++) {
      const bad = await verifyAndConsume(
        db,
        { pepper },
        {
          purpose: 'password_reset',
          email: 'otp-lock@example.com',
          code: '000000',
        },
      );
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.error.reason).toBe('OTP_INVALID');
    }
    const locked = await verifyAndConsume(
      db,
      { pepper },
      {
        purpose: 'password_reset',
        email: 'otp-lock@example.com',
        code: '000000',
      },
    );
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error.reason).toBe('OTP_LOCKED');
  });
});
