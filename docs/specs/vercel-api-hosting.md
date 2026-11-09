# docs/specs/vercel-api-hosting.md

Decision record: [ADR-0016](../adr/0016-vercel-api-hosting-and-cron-worker.md). Not a feature spec for users;
it defines the acceptance for moving the API to Vercel while Render stays live. Phase labels below are this
migration's own (Phase 0–4), not the alignment-initiative phases.

## Invariant

1. Render keeps serving production, unchanged in behaviour, until the cutover step is executed. Every change
   that merges to `main` before then must pass the existing CI **and** leave the Node entry (`src/index.ts`) and
   the Docker image working.
2. No production data is read or written by the Vercel API before cutover; it uses a Neon branch.
3. Migrations stay additive (no drops or renames) until Render is retired, so rollback never needs a schema
   change.
4. The cron route never runs unauthenticated and never runs on a host where `CRON_SECRET` is unset.

## Scope

In: Vercel entry point, serverless-safe startup, DB client options, cron route replacing `apps/worker`,
OpenTofu for the Vercel API project and domains, remote state, cutover and rollback procedure.
Out: AI hosting (stays `AI_MODE=fallback`), mobile feature work, any change to nutrition or business logic.

## Findings this spec is based on

- `apps/api/src/index.ts` calls `serve()` from `@hono/node-server`, loads `TENANT_MANIFEST_PATH` with
  `readFileSync` and runs `syncSingleOrgRegistryFromFile` at top level.
- `apps/api/src/app.ts` exposes `/health/live` and `/health/ready` (DB `select 1`). Routes live in
  `apps/api/src/routes/` and are registered in `app.ts`.
- The three worker jobs that matter are plain functions in `apps/worker/src/jobs/checkins-roll.ts`:
  `rollCheckIns(db, coachUserId, zone)`, `refreshAttention(db, zone)`, `cleanupExpired(db)`. The ranking job is
  `refreshFoodRankings(db)` from `@gymos/modules/nutrition`. `apps/worker/src/index.ts` only schedules and
  calls them (cron `5/15/25 21` and `30 22` UTC; `TENANT_TIMEZONE` default `Asia/Karachi`).
- Mobile reads `process.env.EXPO_PUBLIC_API_URL` in `apps/mobile/src/configure-mobile-api.ts`. Expo inlines
  `EXPO_PUBLIC_*` at build time, so **the API URL is baked into each mobile build**.
- Web proxies `/v1`, `/gate`, `/health` through `API_ORIGIN` (`apps/web/next.config.mjs`) and is already on
  Vercel (`infra/paas/vercel.tf`, `var.render_api_url`).
- ESLint boundaries (`eslint.config.mjs`) let `app-worker` import `modules`, `db`, `core`, `contracts`, `ai`;
  job bodies must live in a package, not in `apps/api`, to stay shareable.

## Acceptance

### A. Entry point and startup (Phase 0–1)

- Given a request to the Vercel deployment, When it hits `/health/live`, Then it returns `200 {"status":"live"}`.
- Given the Vercel deployment, When `/health/ready` is called, Then it returns `200` only if the Neon branch
  answers `select 1`, and `500 NOT_READY` otherwise.
- Given a cold start, When two requests arrive concurrently, Then app construction and the registry sync run
  once per instance, not per request.
- Given the Node entry (`pnpm --filter @gymos/api dev` and the Docker image), When started, Then behaviour is
  identical to before this change (same startup log, same sync, same routes).
- Given `TENANT_MANIFEST_PATH`, When the function bundle is built, Then the manifest file is present at that
  path inside the bundle (`includeFiles`), and a test fails if the file is missing.

### B. Database client (Phase 1)

- Given the pooled Neon URL, When the API runs on Vercel, Then prepared statements are disabled
  (`prepare: false`) and the pool `max` is at most 2 per instance.
- Given the Render environment (direct connection), When `prepare`/`max` env options are unset, Then the
  client behaves exactly as today (default prepared statements, existing `max`).
- Given migrations and seed, When run, Then they use the direct URL, never the pooled one.

### C. Cron route replaces the worker (Phase 2)

- Given `CRON_SECRET` is unset, When `/internal/cron/nightly` is called, Then it returns `404` and runs
  nothing.
- Given `CRON_SECRET` is set, When the request lacks `Authorization: Bearer <secret>` or the secret differs,
  Then it returns `401` with a problem response and runs nothing (constant-time comparison).
- Given a valid request, When it runs, Then the jobs execute in order: check-in roll, attention refresh,
  ranking refresh, cleanup; a failure in one is recorded and reported, and the later jobs still run.
- Given the route is called twice in a row, When the second call runs, Then no duplicate DUE check-ins, no
  duplicate escalation notifications, and no changed attention rows beyond `computedAt` (idempotency test for
  each job). The overdue escalation at +3 days must fire once only; confirm in the test because the
  escalation code was not part of the review that produced this spec.
- Given the route, Then it is registered from `apps/api/src/routes/`, not appended to `app.ts`, is not part
  of the public OpenAPI document, and the OpenAPI drift CI check still passes.
- Given job bodies, Then they live in `packages/modules` (public barrel) and use Luxon only (no
  `new Date()`); `apps/worker` imports them from there until it is retired.
- Given `TENANT_TIMEZONE`, When unset, Then it defaults to `Asia/Karachi` in the API env schema, as in the
  worker.
- Given `vercel.json`, Then exactly one cron entry exists, daily at about 21:05 UTC, calling the route.
  (Vercel injects the bearer secret when `CRON_SECRET` is set; verify against current Vercel docs in
  Phase 0.)

### D. Infrastructure as code (Phase 0, 4)

- Given `infra/paas`, Then `vercel_project.api` defines root `apps/api`, monorepo install/build commands,
  Node 22, the Git link and all environment variables; secrets are marked sensitive; no secret value is
  committed.
- Given `infra/paas`, Then a `neon_branch` resource exists for the test database.
- Given `render_api_url`, Then it is renamed to a host-neutral `api_origin`; `API_ORIGIN` keeps its production
  value (Render URL) until the cutover change.
- Given state, Then OpenTofu state is on a Cloudflare R2 S3 backend following the `demo-infra` pattern
  (separate key, lock test passes, client-side encryption), and `terraform.tfstate*` / `terraform.tfvars`
  remain untracked.
- Given DNS, Then the two CNAMEs (`gymos`, `gymos-api` under `khubaibqaiser.com`) are added in the
  `demo-infra` repo, targets taken from Vercel at apply time; the API CNAME is added at the cutover rehearsal,
  not earlier.

### E. Parallel run and verification (Phase 3)

- Given a Vercel Preview of the web app with `API_ORIGIN` overridden for the Preview environment only, Then
  production web still talks to Render.
- Given the Preview, When the Playwright login smoke test runs, Then it passes against the Vercel API.
- Given the manual pass (create client, generate draft plan, publish, complete a check-in, download the diet
  plan PDF and the credentials PDF), Then every step succeeds and the PDFs render with correct fonts.
- Given the slowest measured endpoint (plan generation and PDF), Then its p95 is comfortably below the
  Hobby function limit (record the numbers in the PR).
- Given a Neon branch, When the cron runs on several nights, Then it completes without errors and writes
  the same results as the worker logic did in tests.

### F. Cutover and rollback (Phase 4)

Go bar: at least one week on the Neon branch with zero server errors; E all green; cron clean on several
nights; mobile build plan agreed (see below).

Cutover steps, in order:

1. Run pending migrations with the direct URL; confirm they are additive and Render still passes its health
   checks.
2. Set the Vercel API `DATABASE_URL` to the production pooled URL, with the same `JWT_ACCESS_SECRET` and
   `OTP_PEPPER` as Render.
3. Attach `gymos-api.khubaibqaiser.com` (Vercel domain + CNAME in `demo-infra`) and wait for TLS.
4. Change `api_origin` and apply; production web now proxies to the Vercel API.
5. Watch errors and latency. Render stays running and untouched.

Acceptance:

- Given cutover, When a user who was logged in before it makes a request, Then they are still authenticated
  (same secrets) and nothing needs re-login.
- Given a problem after cutover, When `api_origin` is set back to the Render URL and applied, Then production
  web serves from Render again within minutes with no data migration.
- Given mobile, Then builds released **after** cutover set `EXPO_PUBLIC_API_URL` to
  `https://gymos-api.khubaibqaiser.com`. Builds already in users' hands keep calling Render, so **Render is not
  retired until those builds are replaced or confirmed unused.**

### G. Retirement (after cutover is stable)

- Given a stable period and no traffic to Render, When retired, Then `apps/worker`, pg-boss, `queue-db` and the
  Render Blueprint are removed in separate PRs, and `pilot-go-live-paas.md` is updated. The Dockerfile and VM
  path stay for the Oracle/Hetzner option.

## Tests (to be written; each must fail before its change)

| Area                 | Test                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| A. Entry             | `apps/api/tests/vercel-entry.test.ts` — health live/ready through the Vercel handler |
| A. Lazy init         | unit test: init runs once for concurrent first requests                              |
| A. Manifest bundle   | test that `TENANT_MANIFEST_PATH` resolves to an existing file from the bundle config |
| B. DB options        | `packages/db` test: `prepare`/`max` options applied only when set                    |
| C. Cron auth         | `apps/api/tests/cron-auth.test.ts` — 404 unset, 401 wrong/missing, 200 valid         |
| C. Cron idempotency  | `packages/modules` tests per job, run twice, assert no duplicates                    |
| C. Failure isolation | one job throws, remaining jobs still run, response reports the failure               |
| D. IaC               | `tofu validate`/`plan` in CI; no secret literal in `.tf`; gitleaks passes            |
| E. Smoke             | Playwright login smoke against the Preview deployment                                |

## Phases and PRs

One logical unit per PR; each PR body names this spec and the checklist item it satisfies. Run the `reviewer`
subagent before opening each. `packages/core`, `packages/ai` and `infra/` need CODEOWNERS review.

| Phase | Work                                                        | Touches Render? |
| ----- | ----------------------------------------------------------- | --------------- |
| 0     | Spike: Vercel API project, entry file, health, DB read, PDF | No (new files)  |
| 1     | Serverless-safe startup, DB options, `includeFiles`         | Yes — keep safe |
| 2     | Cron route, job bodies to `packages/modules`, idempotency   | Inert           |
| 3     | Preview web + full verification, latency numbers            | No              |
| 4     | Remote state, domains, cutover rehearsal, cutover, rollback | Config only     |

Phase 0 is allowed to end the plan: if workspace TypeScript will not bundle, pdfkit cannot render, or the
timeout cannot be met, record it in ADR-0016 and fall back to Render plus an external scheduler calling the
same cron route.

## Open items

- Deployment is CI-only (`.github/workflows/infra-paas.yml`, R2 state): no local `tofu apply`, no dashboard secrets.
- The manifest is copied into `apps/api/tenants/` by the project build command and bundled with
  `includeFiles: tenants/**` (the provider cannot set "files outside the Root Directory"). The first deploy must
  confirm where the file lands relative to `TENANT_MANIFEST_PATH` (`tenants/pilot.json`) and that extensionless
  relative imports resolve in the Vercel build.

- Confirm the current Vercel Hobby limits (function timeout, cron count and frequency, bundle size) before
  Phase 0 starts; this spec treats them as unverified.
- Confirm how Vercel supplies `CRON_SECRET` to cron calls.
- `demo-infra` change for the two CNAMEs (static `sites.json` entry vs records-only entry) needs its own PR
  in that repo.
- Decide the mobile release plan: which builds exist, and when the first build pointing at
  `gymos-api.khubaibqaiser.com` ships.
