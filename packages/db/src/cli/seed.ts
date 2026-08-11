import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { createDb } from '../client';
import { seed } from '../seed';

/**
 * Seed CLI. Hashes `PILOT_COACH_PASSWORD` (default for local DX) with the same
 * scrypt format as `@gymos/modules/identity`, or accepts a precomputed
 * `PILOT_COACH_PASSWORD_HASH`. packages/db must not import modules (boundary).
 */
const scrypt = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

const hashPasswordLocal = async (password: string): Promise<string> => {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`;
};

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const coachPasswordHash =
  process.env.PILOT_COACH_PASSWORD_HASH ??
  (await hashPasswordLocal(process.env.PILOT_COACH_PASSWORD ?? 'pilot-coach-change-me'));

const { db, close } = createDb(url, 1);
try {
  const result = await seed(db, { coachPasswordHash });
  console.log('seeded:', result);
  console.log('pilot coach login: coach@pilot.local (password from PILOT_COACH_PASSWORD)');
} finally {
  await close();
}
