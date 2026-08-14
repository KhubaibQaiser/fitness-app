# GymOS

Coaching-first gym platform. Current phase: **Pilot** — a single-coach, mobile-first web app where a coach records client vitals, generates draft meal plans (deterministic nutrition engine + optional local LLM for meal names/prep notes only), reviews and edits before publish, tracks weekly check-ins, and gets adaptive plan adjustments — at $0/month infrastructure cost. See [docs/adr/0001-hybrid-ai-nutrition.md](docs/adr/0001-hybrid-ai-nutrition.md).

## Architecture (pilot)

- **Monorepo**: Turborepo + pnpm. Feature code uses React Native primitives (`packages/app`) rendered on web via Tamagui + react-native-web, so native mobile (P3) is a deployment, not a rewrite. `apps/mobile` must always bundle green in CI.
- **Apps**: `web` (Next.js 16, installable PWA) · `api` (Hono modular monolith) · `worker` (same image, pg-boss) · `mobile` (Expo shell, CI gate only).
- **Data**: PostgreSQL 17 (Neon free tier), Drizzle ORM. Queue state in an ephemeral VM-local Postgres (pg-boss).
- **AI**: Hybrid — Layers 1–2 own calories/macros; llama.cpp + Qwen3 (optional) names meals only. Coach must review before publish. No data leaves our infrastructure.
- **Infra**: Oracle Always Free VM + Caddy (DuckDNS DNS-01 TLS) + Cloudflare R2. Everything free. If Oracle capacity is blocked, use the stripped PaaS pilot ([`docs/pilot-go-live-paas.md`](docs/pilot-go-live-paas.md), IaC in [`infra/paas/`](infra/paas/)): Vercel + Render free + Neon (worker/LLM off).

## Getting started

```bash
nvm use                 # Node 22 (see .nvmrc)
corepack enable         # pnpm (version pinned in package.json)
pnpm install
cp .env.example .env    # fill local placeholders — never commit .env
docker compose up -d    # local Postgres, queue-db, MinIO
pnpm db:migrate && pnpm db:seed
pnpm dev                # web :3000, api :8080, worker (loads root .env)
```

Open `http://localhost:3000/login` and sign in as `coach@pilot.local` with
`PILOT_COACH_PASSWORD` from your `.env` (default after seed:
`pilot-coach-change-me`).
Production pilot: `https://gymos-pilot.duckdns.org`.

## Security policy (non-negotiable)

- **No secrets in this repo, ever.** `.env.example` holds placeholders only. Secret scanning (gitleaks) runs pre-commit (staged), pre-push (history), and in CI on every PR — a finding fails the pipeline.
- gitleaks is expected on `PATH` (`~/.tools/bin` works): <https://github.com/gitleaks/gitleaks/releases>
- All external communication is HTTPS (Caddy auto-TLS, HSTS); `/v1` requires a JWT except public auth routes; the LLM container has no network egress.
- Report anything suspicious via a private GitHub security advisory, not a public issue.

## Repository layout

See `docs/` for architecture decision records (`docs/adr/`), operational runbooks (`docs/runbooks/`), and the technical investor pitch (`docs/pitch/`). The authoritative build plan lives with the product docs.
