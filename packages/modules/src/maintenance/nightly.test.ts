import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { runNightly } from './nightly';

let db: Db;

const snapshot = async () => ({
  checkIns: (await db.select().from(s.checkIns)).map((r) => `${r.id}:${r.status}`).sort(),
  notifications: (await db.select().from(s.notifications)).map((r) => r.id).sort(),
  // `since` is rewritten on every run by refreshAttention (existing behaviour, flagged in the PR).
  attention: (await db.select().from(s.clientAttention)).map(
    (r) =>
      `${r.clientId}:${r.score}:${JSON.stringify(r.reasons.map((x) => ({ ...x, since: '' })))}`,
  ),
});

beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema: s });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../db/migrations'),
  });
  db = pglite as unknown as Db;
  await seed(db, { coachPasswordHash: 'test-hash' });
  // Make the DUE check-in long overdue so the +3 day escalation fires.
  await db
    .update(s.checkIns)
    .set({ scheduledFor: '2020-01-01' })
    .where(eq(s.checkIns.status, 'DUE'));
});

describe('runNightly', () => {
  it('is idempotent: a second run changes no check-ins, notifications or attention rows', async () => {
    const first = await runNightly(db, 'Asia/Karachi');
    expect(first.every((r) => r.ok)).toBe(true);
    const afterFirst = await snapshot();
    expect(afterFirst.notifications.length).toBeGreaterThan(0); // escalation fired once

    const second = await runNightly(db, 'Asia/Karachi');
    expect(second.every((r) => r.ok)).toBe(true);
    expect(await snapshot()).toEqual(afterFirst);
  });

  it('keeps running later jobs when one fails', async () => {
    const broken = new Proxy(db, {
      get: (target, prop, receiver): unknown =>
        prop === 'select'
          ? () => {
              throw new Error('db down');
            }
          : Reflect.get(target, prop, receiver),
    });
    const results = await runNightly(broken, 'Asia/Karachi');
    expect(results.map((r) => r.job)).toEqual([
      'checkins-roll',
      'attention-refresh',
      'ranking-refresh',
      'cleanup',
    ]);
    expect(results.some((r) => !r.ok)).toBe(true);
  });
});
