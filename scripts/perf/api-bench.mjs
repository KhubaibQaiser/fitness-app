// Server-time benchmark of the endpoints the main screens call: 30 sequential requests per endpoint
// after a warm-up call, then 20 parallel requests x 5 rounds on the polled endpoints. Read-only
// apart from the sign-in. Run it against an API on a synthetic database (seed-synthetic.mjs).
// Usage: PILOT_COACH_PASSWORD=... node scripts/perf/api-bench.mjs <apiBase> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiClient, writeResults } from './lib.mjs';

const [base, out] = process.argv.slice(2);
if (!base || !out) throw new Error('usage: api-bench.mjs <apiBase> <outDir>');
mkdirSync(out, { recursive: true });
const api = apiClient(base);
await api.signIn();

const clients = (await api.call('GET', '/v1/clients')).json.items;
const sample = clients.slice(0, 5).map((c) => c.id);
const plans = [];
for (const { id } of clients) {
  const first = (await api.call('GET', `/v1/clients/${id}/meal-plans`)).json.items[0];
  if (first) plans.push(first.id);
  if (plans.length >= 5) break;
}
if (sample.length === 0 || plans.length === 0) {
  throw new Error('needs clients with meal plans: run seed-synthetic.mjs on this database first');
}

const client = (k) => sample[k % sample.length];
const plan = (k) => plans[k % plans.length];
const ENDPOINTS = [
  ['me', () => '/v1/me'],
  ['roster', () => '/v1/clients'],
  ['due check-ins', () => '/v1/check-ins'],
  ['unread count', () => '/v1/notifications/unread-count'],
  ['notifications', () => '/v1/notifications'],
  ['client detail', (k) => `/v1/clients/${client(k)}`],
  ['client vitals', (k) => `/v1/clients/${client(k)}/vitals`],
  ['client check-ins', (k) => `/v1/clients/${client(k)}/check-ins`],
  ['meal plans list', (k) => `/v1/clients/${client(k)}/meal-plans`],
  ['meal plan detail', (k) => `/v1/meal-plans/${plan(k)}`],
  ['diet-plan PDF', (k) => `/v1/meal-plans/${plan(k)}/diet-plan.pdf`],
  ['food search', () => '/v1/foods?q=ch'],
];
const N = 30;
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  return { n: s.length, p50: q(0.5), p95: q(0.95), max: +s.at(-1).toFixed(1) };
};

const endpoints = {};
for (const [name, path] of ENDPOINTS) {
  await api.call('GET', path(0));
  const ms = [];
  let bytes = 0;
  for (let k = 0; k < N; k += 1) {
    const res = await api.call('GET', path(k));
    ms.push(res.ms);
    bytes = res.bytes;
  }
  endpoints[name] = { ...stats(ms), kb: +(bytes / 1024).toFixed(1) };
  console.log(name, JSON.stringify(endpoints[name]));
}

// Twenty coaches at once on the roster and the two endpoints the app polls.
const parallel = async (path) => {
  const ms = [];
  for (let round = 0; round < 5; round += 1) {
    const batch = await Promise.all(Array.from({ length: 20 }, () => api.call('GET', path)));
    ms.push(...batch.map((b) => b.ms));
  }
  return stats(ms);
};
const concurrency = {
  'roster x20': await parallel('/v1/clients'),
  'due check-ins x20': await parallel('/v1/check-ins'),
  'unread count x20': await parallel('/v1/notifications/unread-count'),
};
console.log('concurrency', JSON.stringify(concurrency));

writeFileSync(
  join(out, 'api.json'),
  JSON.stringify(
    { at: new Date().toISOString(), clients: clients.length, endpoints, concurrency },
    null,
    2,
  ),
);
const pick = ({ p50, p95, kb }) => (kb === undefined ? { p50, p95 } : { p50, p95, kb });
writeResults(
  out,
  'api-bench',
  Object.fromEntries(
    Object.entries({ ...endpoints, ...concurrency }).map(([k, v]) => [k, pick(v)]),
  ),
);
console.log('wrote', out, 'clients', clients.length);
