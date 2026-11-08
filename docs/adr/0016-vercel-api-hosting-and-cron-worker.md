# ADR-0016: Move the API from Render to Vercel, and replace the worker with a cron route

- **Status**: Proposed
- **Date**: 2026-11-09

## Context

Today the free PaaS pilot ([`pilot-go-live-paas.md`](../pilot-go-live-paas.md)) runs:

- Web (Next.js) on Vercel, Postgres on Neon, API (Hono, Docker) on Render free.
- No worker. The four nightly jobs (check-in roll, attention refresh, ranking refresh, cleanup) in
  `apps/worker` do not run, because there is no free background worker and the pg-boss queue needs its
  own Postgres.

Problems with the current shape:

1. Render free sleeps after ~15 min idle; the first request takes 30–60 s. This hits web and mobile.
2. The nightly jobs are missing, so the pilot is not full-featured.
3. 512 MB on Render is tight for `tsx` + pdfkit.

Constraints and facts:

- The API is stateless apart from Postgres (rate limiting is DB-backed), so it can run as a serverless
  function. Nothing in it needs Docker; Docker is only a packaging choice (one image, two entrypoints).
- The API reads `infra/tenants/pilot.json` from disk (`readFileSync`) and runs `syncSingleOrgRegistryFromFile`
  at top level on startup. Both need handling in a serverless runtime.
- Vercel Hobby is non-commercial only, has a short default function timeout, and limits cron to once a day.
  The user confirmed the deployment is a **personal / demo pilot** with no paying clients, so Hobby is allowed.
- AI mode stays `fallback` (see ADR-0001). AI hosting is out of scope here.
- `khubaibqaiser.com` is managed by the `demo-infra` repo: DNS CNAMEs via CDK (Route 53 zone owned by
  `portfolio-v2`), OpenTofu state on Cloudflare R2 with a lock test and client-side encryption. Hostnames
  follow `<name>` for the frontend and `<name>-api` for the backend.
- Repo rules ([`AGENTS.md`](../../AGENTS.md)): new routes go in `apps/api/src/routes/`, not `app.ts`; every
  change needs a test that would have failed before; `infra/` changes need human review.

## Decision

1. **Run the API on Vercel** as a separate project (`gymos-api`, root `apps/api`) with a serverless entry
   point `apps/api/api/index.ts` that wraps the existing `buildApp` using `hono/vercel`. The Node entry
   `apps/api/src/index.ts` and the Dockerfile stay, unchanged in behaviour, for Render and the VM path.
   Startup work becomes a once-per-instance lazy init; the tenant manifest is bundled with `includeFiles`.
2. **Keep Neon.** Runtime uses the pooled URL with `prepare: false` (configurable by env so Render's
   direct path is unaffected) and a small `max`. Migrations and seed use the direct URL. Until cutover the
   Vercel API runs against a **Neon branch** of production, never production data.
3. **Replace `apps/worker` with one cron route** under `apps/api/src/routes/` that runs the four jobs in
   order, protected by `CRON_SECRET`, triggered once daily by Vercel Cron (~21:05 UTC). Job bodies move to
   `packages/modules` so the route and any future runner share them, and each job is idempotent. The route
   is inert on Render (no `CRON_SECRET`). `apps/worker`, pg-boss and `queue-db` are retired only after
   cutover is stable.
4. **Run both stacks in parallel and cut over with one setting.** Production web keeps `API_ORIGIN` pointed
   at Render until cutover. Preview deployments override `API_ORIGIN` for testing. Cutover = point the
   Vercel API at the production database (same `JWT_ACCESS_SECRET` and `OTP_PEPPER` as Render so sessions
   and OTPs stay valid), run additive-only migrations, then change `API_ORIGIN`. Rollback = set it back.
5. **Domains.** Web: `gymos.khubaibqaiser.com`. API: `gymos-api.khubaibqaiser.com`.
   - DNS CNAMEs are added in `demo-infra` (CDK), which owns the zone relationship. The target values come
     from Vercel at apply time and are not assumed here.
   - Vercel projects and domain attachments are defined in this repo's `infra/paas` OpenTofu.
   - The API domain is attached at the cutover rehearsal, not earlier. Until then testing uses
     `*.vercel.app` URLs. Mobile builds released after cutover use `gymos-api.khubaibqaiser.com`.
6. **OpenTofu state moves to a remote backend** on Cloudflare R2 (S3 backend), following the `demo-infra`
   pattern: separate key, lock test before relying on it, client-side state encryption. Existing local
   state is migrated with `tofu init -migrate-state`. Local `terraform.tfstate*` and `terraform.tfvars`
   stay untracked.
7. **Go / no-go bar for cutover:** at least one week on the Neon branch with zero server errors; slowest
   endpoint (plan generation, PDF) comfortably inside the function limit; cron has run clean on several
   nights; login smoke and a full manual pass (create client, generate plan, publish, check-in, both PDFs)
   pass through a Vercel preview of the web app.

## Consequences

**Easier**

- No cold-wake delay like Render's; first-request latency is a normal serverless cold start.
- The nightly jobs run again, with no queue database.
- Web, API and domains live in code (OpenTofu plus `demo-infra`), and the switch is one reviewed setting.

**Harder**

- Two entry points to keep working until Render is retired. Shared-code changes merge to `main` and
  redeploy Render, so each must be safe on both hosts and covered by tests.
- Migrations must stay additive until Render is gone, so rollback remains possible.
- Cron is daily only with ~1 h timing accuracy on Hobby; jobs that need to run more often do not fit.
- Cross-repo coupling: DNS lives in `demo-infra`, hosting in this repo.

**Risks to check in the spike (Phase 0)**

- Workspace TypeScript packages bundle on Vercel.
- pdfkit font files are included in the function bundle and both PDFs render.
- `prepare: false` through Neon's pooler works with the Drizzle/postgres.js client.
- Where the mobile app's API base URL is set. If baked into the build, existing builds keep using Render
  until updated, so Render must not be retired before those builds are replaced.

**Triggers to revisit this decision**

- First paying client or any commercial use: upgrade to Vercel Pro or move back to Render.
- A measured endpoint exceeds the Hobby function timeout, or the spike shows bundling or pdfkit cannot work:
  stay on Render and run the cron route from GitHub Actions or an external scheduler instead.
- A job needs to run more than once a day.
- Neon free limits (storage, compute hours) are hit.

## Alternatives considered

- **Stay on Render and call the same cron route from GitHub Actions or cron-job.org.** Cheapest change and
  commercial use is allowed, but the sleep problem remains. Kept as the fallback.
- **Cloudflare Workers.** Hono fits, but the free CPU limit is too tight for the solver and pdfkit, and the
  Postgres path would change. Not pursued.
- **Fly.io or an Oracle Always Free VM.** Run the existing Docker image and worker unchanged, but free
  capacity and terms are uncertain. Remains the long-term path in [`pilot-go-live.md`](../pilot-go-live.md).
- **Keep pg-boss on Vercel.** Not viable: it needs a long-lived process and its own Postgres.

## Follow-ups

- Spec under `docs/specs/` describing the phases, entry point, cron route and cutover checklist.
- Matching change in `demo-infra` (`sites.json` or a records-only entry plus tests) for the two CNAMEs.
- Rename `render_api_url` to a host-neutral `api_origin` variable in `infra/paas`.
