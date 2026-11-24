// Cold loads with Lighthouse 12.8.2 (the baseline's version, a root devDependency) against the
// production web build: 5 mobile runs (4x CPU, slow 4G, simulated) and 2 desktop runs. It signs in
// fresh before each signed-in run, because refresh tokens rotate and a reused one trips reuse detection.
// Usage: PILOT_COACH_PASSWORD=... pnpm exec node scripts/perf/lighthouse.mjs <webBase> <outDir>
//        (pnpm exec puts the lighthouse binary on PATH; CHROME_PATH picks the Chrome it drives)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiClient, findFixtures, redactLighthouseReport, writeResults } from './lib.mjs';

const [base, out] = process.argv.slice(2);
if (!base || !out) throw new Error('usage: lighthouse.mjs <webBase> <outDir>');
mkdirSync(out, { recursive: true });
const api = apiClient(base);
await api.signIn();
const C = (await findFixtures(api)).plan;
if (!C)
  throw new Error('no client with a meal plan: run seed-synthetic.mjs on this database first');

// The hub, journey and plan editor are left out: under Lighthouse's fixed Cookie header the app's
// token refresh trips reuse detection and those pages show "Could not load" (baseline, "Limits").
// vitals-flow.mjs measures them signed in instead.
const RUNS = [
  ['login', '/login', 'mobile', false],
  ['home', '/', 'mobile', true],
  ['clients', '/clients', 'mobile', true],
  ['checkin', `/clients/${C}/check-in`, 'mobile', true],
  ['intake', '/clients/new', 'mobile', true],
  ['home', '/', 'desktop', true],
  ['clients', '/clients', 'desktop', true],
];

const headersFile = join(out, 'headers.json');
// headers.json holds a live session cookie: remove it on Ctrl-C or kill too, not only at the end.
for (const [signal, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
]) {
  process.on(signal, () => {
    rmSync(headersFile, { force: true });
    process.exit(code);
  });
}
const scenarios = {};
const failed = [];
try {
  for (const [name, path, preset, signedIn] of RUNS) {
    const flags = [];
    let cookie = '';
    if (signedIn) {
      const { headers } = await apiClient(base).signIn();
      cookie = headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      if (!cookie) throw new Error('sign-in set no cookies');
      writeFileSync(headersFile, JSON.stringify({ Cookie: cookie }), { mode: 0o600 });
      flags.push(`--extra-headers=${headersFile}`);
    }
    if (preset === 'desktop') flags.push('--preset=desktop');
    const report = join(out, `${name}-${preset}`);
    const run = spawnSync(
      'lighthouse',
      [
        base + path,
        '--quiet',
        '--output=json',
        `--output-path=${report}.json`,
        '--only-categories=performance,accessibility,best-practices',
        '--chrome-flags=--headless=new --no-first-run',
        ...flags,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' },
    );
    if (run.error)
      throw new Error('could not start lighthouse: run this through `pnpm exec`', {
        cause: run.error,
      });
    const reportFile = `${report}.json`;
    const lhr = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, 'utf8')) : null;
    if (lhr) {
      try {
        writeFileSync(reportFile, redactLighthouseReport(lhr, cookie));
      } catch (error) {
        rmSync(reportFile, { force: true }); // never leave an unredacted report behind
        throw error;
      }
    }
    if (run.status !== 0 || !lhr || lhr.runtimeError) {
      failed.push(`${name}-${preset}`);
      const why = lhr?.runtimeError?.code ?? `exit ${run.status}: ${run.stderr.slice(-400)}`;
      console.error(`FAILED ${name}-${preset} (${why})`);
    } else {
      const a = (id) => lhr.audits[id]?.numericValue;
      scenarios[`${name}-${preset}`] = {
        perf: Math.round((lhr.categories.performance.score ?? 0) * 100),
        fcp: Math.round(a('first-contentful-paint')),
        lcp: Math.round(a('largest-contentful-paint')),
        tbt: Math.round(a('total-blocking-time')),
        cls: +a('cumulative-layout-shift').toFixed(3),
        weightKB: Math.round(a('total-byte-weight') / 1024),
        dom: a('dom-size'),
      };
      console.log(`ok ${name}-${preset}`, JSON.stringify(scenarios[`${name}-${preset}`]));
    }
    if (signedIn) await new Promise((r) => setTimeout(r, 7000)); // stay under 10 logins a minute
  }
} finally {
  rmSync(headersFile, { force: true });
}
writeResults(out, 'lighthouse', scenarios);
if (failed.length > 0) {
  console.error(`${failed.length} run(s) failed: ${failed.join(', ')}`);
  process.exit(1);
}
