// One iOS simulator screenshot per coach route, reached by deep link (gymos:///<path>), so no
// audit-only app edits are needed. Before running: Metro serving the app, the app open on that
// simulator and signed in as the seeded coach (README, "iOS capture").
// Usage: PILOT_COACH_PASSWORD=... node scripts/visual/ios-capture.mjs <udid> <apiBase> <outDir> [suffix]
//        SETTLE_MS=5000 sets the wait after each link before the screenshot.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiClient, findFixtures } from '../perf/lib.mjs';
import { coachRoutes, resolvable, WEB_ONLY } from './routes.mjs';

const [udid, apiBase, outDir, suffix = ''] = process.argv.slice(2);
if (!udid || !apiBase || !outDir) {
  throw new Error('usage: ios-capture.mjs <udid> <apiBase> <outDir> [suffix]');
}
const settleMs = Number(process.env.SETTLE_MS ?? 5000);
const api = apiClient(apiBase);
await api.signIn();
const { routes, skipped } = resolvable(
  coachRoutes(await findFixtures(api)).filter(([key]) => !WEB_ONLY.has(key)),
);
mkdirSync(outDir, { recursive: true });

const simctl = (...args) =>
  execFileSync('xcrun', ['simctl', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
for (const [key, path] of routes) {
  simctl('openurl', udid, `gymos://${path}`);
  await new Promise((r) => setTimeout(r, settleMs));
  simctl('io', udid, 'screenshot', join(outDir, `${key}${suffix}.png`));
  console.log('shot', `${key}${suffix}`, path);
}
writeFileSync(
  join(outDir, `index${suffix}.json`),
  JSON.stringify({ skipped, shots: routes }, null, 2),
);
