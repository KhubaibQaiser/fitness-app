# GymOS

Coaching-first gym platform. Current phase: **Pilot** — a single-coach, mobile-first web app where a coach records client vitals, generates AI meal plans (deterministic nutrition engine + local LLM for language), tracks weekly check-ins, and gets adaptive plan adjustments — at $0/month infrastructure cost.

## Architecture (pilot)

- **Monorepo**: Turborepo + pnpm. Feature code uses React Native primitives (`packages/app`) rendered on web via Tamagui + react-native-web, so native mobile (P3) is a deployment, not a rewrite. `apps/mobile` must always bundle green in CI.
- **Apps**: `web` (Next.js 16, installable PWA) · `api` (Hono modular monolith) · `worker` (same image, pg-boss) · `mobile` (Expo shell, CI gate only).
- **Data**: PostgreSQL 17 (Neon free tier), Drizzle ORM. Queue state in an ephemeral VM-local Postgres (pg-boss).
- **AI**: llama.cpp + Qwen3 (Apache 2.0) on our own VM — JSON-schema-constrained, language-only (all numbers are deterministic). No data leaves our infrastructure.
- **Infra**: Oracle Always Free VM + Caddy (DuckDNS DNS-01 TLS) + Cloudflare R2. Everything free.

## Getting started

```bash
nvm use                 # Node 22 (see .nvmrc)
corepack enable         # pnpm (version pinned in package.json)
pnpm install
cp .env.example .env    # fill local placeholders — never commit .env
docker compose up -d    # local Postgres, queue-db, MinIO
pnpm dev
```

## Security policy (non-negotiable)

- **No secrets in this repo, ever.** `.env.example` holds placeholders only. Secret scanning (gitleaks) runs pre-commit (staged), pre-push (history), and in CI on every PR — a finding fails the pipeline.
- gitleaks is expected on `PATH` (`~/.tools/bin` works): <https://github.com/gitleaks/gitleaks/releases>
- All external communication is HTTPS (Caddy auto-TLS, HSTS); the API is never exposed without the access gate; the LLM container has no network egress.
- Report anything suspicious via a private GitHub security advisory, not a public issue.

## Repository layout

See `docs/` for architecture decision records (`docs/adr/`) and operational runbooks (`docs/runbooks/`). The authoritative build plan lives with the product docs.
