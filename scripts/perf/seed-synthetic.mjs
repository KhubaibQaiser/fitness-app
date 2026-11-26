// Fills a fresh local database with a synthetic roster through the real API: N clients with weekly
// weigh-ins, a weight-loss goal each, and a generated meal plan for every 4th client. The 2026-11-23
// baseline used 170; the roster budget is set at 500. It migrates and seeds the database first, runs
// its own API against it, and stops if the database already holds data (the seed refuses to re-seed).
// Usage: DATABASE_URL=postgres://gymos:gymos@localhost:5432/gymos_perf_170 PILOT_COACH_PASSWORD=... \
//          node scripts/perf/seed-synthetic.mjs <clients> [apiPort, default 8189]
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { apiClient, assertSyntheticDatabaseUrl, coachCredentials } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const DATABASE_URL = assertSyntheticDatabaseUrl(process.env.DATABASE_URL);
const count = Number(process.argv[2]);
const port = Number(process.argv[3] ?? 8189);
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(port)) {
  throw new Error('usage: seed-synthetic.mjs <clients> [apiPort]');
}
const env = {
  ...process.env,
  DATABASE_URL,
  PILOT_COACH_PASSWORD: coachCredentials().password,
  TENANT_MANIFEST_PATH: `${root}infra/tenants/pilot.json`,
};

const node = (cwd, args, extraEnv = {}) =>
  spawn(process.execPath, args, {
    cwd: root + cwd,
    env: { ...env, ...extraEnv },
    stdio: 'inherit',
  });
const finished = (child, what) =>
  new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${what} exited with ${code}`)),
    );
  });

const base = `http://127.0.0.1:${port}`;
// Whatever answers on this port gets the synthetic data, so it must be the API started below.
if (
  await fetch(`${base}/health/live`).then(
    () => true,
    () => false,
  )
) {
  throw new Error(`port ${port} is already in use: pass a free port as the second argument`);
}
await finished(node('packages/db', ['--import', 'tsx', 'src/cli/migrate.ts']), 'migrate');
await finished(node('packages/db', ['--import', 'tsx', 'src/cli/seed.ts']), 'seed');

const server = node('apps/api', ['--import', 'tsx', 'src/index.ts'], {
  PORT: String(port),
  NODE_ENV: 'development',
  AI_MODE: 'fallback',
  JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
});
let stopping = false;
// Rejects only if the API dies on its own; stopping it at the end leaves this pending on purpose.
const serverDown = new Promise((_, reject) =>
  server.on('exit', (code) => {
    if (!stopping) reject(new Error(`API exited early with ${code}`));
  }),
);
const counts = { clients: 0, weighIns: 0, plans: 0 };
const planFailures = [];
try {
  for (let waited = 0; ; waited += 500) {
    const up = await fetch(`${base}/health/live`).then(
      (res) => res.ok,
      () => false, // connection refused until the server listens; retried below
    );
    if (up && server.exitCode === null) break;
    if (waited > 60_000) throw new Error(`API did not answer ${base}/health/live within 60 s`);
    await Promise.race([new Promise((r) => setTimeout(r, 500)), serverDown]);
  }

  const api = apiClient(base);
  await api.signIn();
  // Names, seed and shape match the 2026-11-23 audit, so 170 reproduces the baseline's data.
  const FIRST = [
    'Ayesha',
    'Bilal',
    'Hamza',
    'Zainab',
    'Usman',
    'Fatima',
    'Ali',
    'Mariam',
    'Saad',
    'Hira',
    'Omar',
    'Sana',
    'Imran',
    'Noor',
    'Danish',
    'Amna',
    'Faisal',
    'Rabia',
    'Kamran',
    'Iqra',
  ];
  const LAST = [
    'Khan',
    'Ahmed',
    'Malik',
    'Qureshi',
    'Siddiqui',
    'Butt',
    'Chaudhry',
    'Raza',
    'Sheikh',
    'Hashmi',
    'Mirza',
    'Javed',
  ];
  let seed = 42; // fixed seed: the same N gives the same roster every time
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    const sex = rand() < 0.5 ? 'F' : 'M';
    const created = await api.call('POST', '/v1/clients', {
      name: `${pick(FIRST)} ${pick(LAST)}`,
      sex,
      dob: `${1975 + Math.floor(rand() * 30)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
      heightCm: Math.round(sex === 'F' ? 155 + rand() * 15 : 165 + rand() * 20),
      activityLevel: pick([1.2, 1.375, 1.55, 1.725]),
    });
    const id = created.json.id ?? created.json.client?.id;
    if (!id)
      throw new Error(
        `POST /v1/clients returned no id: ${JSON.stringify(created.json).slice(0, 200)}`,
      );
    counts.clients += 1;
    const start = Math.round(65 + rand() * 45);
    const weeks = 4 + Math.floor(rand() * 16);
    for (let w = weeks; w >= 0; w -= 1) {
      await api.call('POST', `/v1/clients/${id}/vitals`, {
        recordedAt: new Date(now - w * 7 * 86_400_000).toISOString(),
        weightKg: Math.round((start - (weeks - w) * (0.2 + rand() * 0.5)) * 10) / 10,
      });
      counts.weighIns += 1;
    }
    await api.call('POST', `/v1/clients/${id}/goals`, {
      preset: 'LOSE',
      rate: pick(['CONSERVATIVE', 'STANDARD']),
      startWeightKg: start,
      targetWeightKg: start - 8,
    });
    if (i % 4 === 0) {
      try {
        await api.call('POST', `/v1/clients/${id}/meal-plans/generate`, {
          mealCount: pick([3, 4, 5]),
        });
        counts.plans += 1;
      } catch (error) {
        // "Solver infeasible" on a synthetic client is a product finding to count, not a seeding failure.
        if (!/-> 422/.test(error.message)) throw error;
        planFailures.push(error.message.slice(0, 200));
      }
    }
    if ((i + 1) % 25 === 0) console.log('seeded', i + 1, 'of', count);
  }
} finally {
  stopping = true;
  server.kill();
}
console.log(JSON.stringify({ ...counts, planFailures: planFailures.length }));
for (const failure of planFailures) console.log('plan not generated:', failure);
