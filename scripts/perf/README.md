# Performance and visual harness

The scripts behind the 2026-11-23 performance baseline ([`docs/revamp/reference/perf-baseline.md`](../../docs/revamp/reference/perf-baseline.md)) and the revamp's screenshot sweeps. Later budget checks ([`docs/revamp/README.md` §9](../../docs/revamp/README.md#9-performance-budgets-from-the-baseline)) compare medians from these same scripts, data and settings. Paths in the table are under `scripts/`.

| Script                               | Measures                                                                                                                                                        | Writes                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `perf/seed-synthetic.mjs <n>`        | Nothing. It fills a fresh local database with `n` synthetic clients through the API: weekly weigh-ins, a goal each, a meal plan for every fourth.               | the database                                      |
| `perf/lighthouse.mjs`                | Cold loads with Lighthouse 12.8.2: 5 mobile runs (4× CPU, slow 4G, simulated) and 2 desktop runs, signing in fresh before each.                                 | `<name>-<preset>.json`, `results.json`            |
| `perf/vitals-flow.mjs`               | 11 signed-in page loads at 390 px under 4× CPU and 150 ms / 1.6 Mbps: FCP, LCP, TBT, long tasks, DOM size, API calls; one roster → hub tap.                     | `vitals.json`, `results.json`, `cpu/`, `film/`    |
| `perf/attribute-cpu.mjs`             | Where a CPU profile from the flow spends its time, by package and function, through the web build's source maps.                                                | stdout                                            |
| `perf/api-bench.mjs`                 | API server time: 30 sequential requests per endpoint, then 20 in parallel × 5 on the polled endpoints.                                                          | `api.json`, `results.json`                        |
| `perf/summarize.mjs`                 | Median and min–max per scenario across repeated runs.                                                                                                           | stdout (markdown table)                           |
| `visual/web-shots.mjs`               | Every web route at 1440 and 390 px, light and dark, with console errors per page.                                                                               | `web-{desktop,mobile}[-dark]/*.png`, `index.json` |
| `visual/ios-capture.mjs`             | One iOS simulator screenshot per coach route, reached by deep link.                                                                                             | `<key>.png`, `index.json`                         |
| [`perf/android/`](android/README.md) | Android cold start, roster scroll jank, memory, a Perfetto trace, a screen recording and a screenshot per screen (by deep link), on an emulator or a USB phone. | `out-*/`                                          |

## Rules

- **This machine only.** Every database URL and base URL must name `localhost`, `127.0.0.1` or `::1`, including a `?host=` override; anything else stops the script before it connects.
- **Synthetic data stays in its own database.** `seed-synthetic.mjs` refuses the everyday `gymos` database, and the seed it runs refuses a database that already holds data.
- **No credentials in files.** Scripts sign in as the seeded coach (`coach@pilot.local`) with `PILOT_COACH_PASSWORD`, the variable the seed hashed. Choose any local value of 12 or more characters and keep it in your shell, not in a file in the repo.
- Outputs are large (screenshots, profiles, reports) and are never committed. Write them outside the repo.

## From a clean checkout

Needs Node 22, pnpm 10, Docker, and Google Chrome (Lighthouse drives the installed Chrome; set `CHROME_PATH` to use another). The examples use the repo's default ports (API 8080, web 3000, Metro 8081); change them if those are taken.

```bash
pnpm install --frozen-lockfile
pnpm --filter @gymos/web exec playwright install chromium   # browser for the flow and the sweep
docker compose up -d db
docker compose exec db createdb -U gymos gymos_perf_170
docker compose exec db createdb -U gymos gymos_perf_500
export PILOT_COACH_PASSWORD='<a local password, 12+ characters>'
```

**1. Synthetic data.** Each run migrates and seeds a fresh database, starts its own API on port 8189 (pass another as the second argument), creates the roster and stops the API. The data is deterministic: 170 clients gives the baseline's 2,192 synthetic weigh-ins and 41 plans (2 more fail as "solver infeasible", counted in the output).

```bash
DATABASE_URL=postgres://gymos:gymos@localhost:5432/gymos_perf_170 node scripts/perf/seed-synthetic.mjs 170
DATABASE_URL=postgres://gymos:gymos@localhost:5432/gymos_perf_500 node scripts/perf/seed-synthetic.mjs 500
```

**2. The API** against the database you are measuring (170 for the baseline tables, 500 for the roster budget):

```bash
cd apps/api && DATABASE_URL=postgres://gymos:gymos@localhost:5432/gymos_perf_170 \
  JWT_ACCESS_SECRET=$(openssl rand -hex 32) AI_MODE=fallback \
  TENANT_MANIFEST_PATH=../../infra/tenants/pilot.json PORT=8080 node --import tsx src/index.ts
```

**3. The production web build**, standalone, as deployed. `API_ORIGIN` is needed both at build time (the `/v1` proxy) and at run time (server-side prefetch):

```bash
API_ORIGIN=http://127.0.0.1:8080 pnpm --filter @gymos/web build
cp -R apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -R apps/web/public apps/web/.next/standalone/apps/web/public
API_ORIGIN=http://127.0.0.1:8080 PORT=3000 HOSTNAME=127.0.0.1 node apps/web/.next/standalone/apps/web/server.js
```

`next build` rewrites `apps/web/next-env.d.ts`; restore it with `git checkout apps/web/next-env.d.ts` before committing.

**4. Measure** (output folders outside the repo):

```bash
pnpm exec node scripts/perf/lighthouse.mjs http://127.0.0.1:3000 ~/gymos-perf/lh-1
node scripts/perf/vitals-flow.mjs http://127.0.0.1:3000 ~/gymos-perf/flow-1
node scripts/perf/api-bench.mjs http://127.0.0.1:8080 ~/gymos-perf/api-1
node scripts/visual/web-shots.mjs http://127.0.0.1:3000 ~/gymos-perf/web-shots
```

`pnpm exec` puts the pinned `lighthouse` binary on `PATH`. `ONLY=roster,hub` limits the flow to some routes; `ONLY=dark` and `TALL=1` adjust the sweep.

### Baseline protocol (5 runs, medians)

Budget checks compare medians, so run each scenario 5 times on a quiet machine (no builds, tests or other benchmarks running) and record the load with each batch:

```bash
uptime
for i in 1 2 3 4 5; do node scripts/perf/vitals-flow.mjs http://127.0.0.1:3000 ~/gymos-perf/flow-$i; done
node scripts/perf/summarize.mjs ~/gymos-perf/flow-*/results.json
```

The same loop works for `lighthouse.mjs` (through `pnpm exec`) and `api-bench.mjs`. Paste the table into the baseline doc with the date, the commit, the database and the `uptime` line.

### Hotspots: CPU profiles mapped to source

`attribute-cpu.mjs` needs a web build with browser source maps. The repo doesn't ship them, so for an attribution run only, set `productionBrowserSourceMaps: true` in `apps/web/next.config.mjs`, rebuild, run the flow, then revert the change (never commit it):

```bash
node scripts/perf/attribute-cpu.mjs ~/gymos-perf/flow-1/cpu/roster.cpuprofile apps/web/.next/static/chunks
```

It exits non-zero when no chunk has a map. Mapping uses Node's built-in `node:module` `SourceMap`.

## iOS capture

`ios-capture.mjs` opens `gymos:///<route>` on the simulator for every coach route, waits (`SETTLE_MS`, default 5000), and saves a screenshot. It needs:

1. A debug build of the app on the simulator (`cd apps/mobile && npx expo run:ios`, once; never commit the generated `ios/` folder).
2. Metro serving it with the API URL: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:8080 pnpm exec expo start`. If Metro runs on a port other than 8081, point the build at it: `xcrun simctl spawn <udid> defaults write app.gymos.coach RCT_jsLocation localhost:<port>`, then relaunch the app.
3. The app open and signed in as the seeded coach (sign in once by hand; the session persists).

```bash
node scripts/visual/ios-capture.mjs <udid> http://127.0.0.1:8080 ~/gymos-perf/ios [-dark]
```

A debug build shows React Native's warning toast, and any render error's red screen, on top of the app. A red screen stays over every later capture until dismissed, so check the shots after a run.

## Which data a route uses

No script hard-codes ids. They read the roster through the API and pick, in whatever data the database holds: a client with a meal plan (synthetic data) for the perf routes, the seed's demo client (it has a completed check-in) for the rich hub and its task screens, and a client without weigh-ins for the empty hub. When the database has no such client, the sweeps skip those routes and list them in `index.json`; the perf scripts stop with a message instead.

## Tests

```bash
pnpm test:perf
```

Covers the local-only URL checks, the synthetic database guard, the credentials rule and the median summary.
