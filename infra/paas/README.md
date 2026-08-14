# PaaS pilot infra (stripped worker) — change hosting from git

This path runs **web + API only** on free tiers so you can pilot without a VM.
Nightly worker jobs (check-in roll, attention, ranking refresh, cleanup) and the
local LLM are off. Product core (login, clients, plans, check-in complete) stays.

| Piece                   | Where                    | Defined in                |
| ----------------------- | ------------------------ | ------------------------- |
| Postgres                | Neon free                | OpenTofu (`neon.tf`)      |
| Web (Next.js)           | Vercel free              | OpenTofu (`vercel.tf`)    |
| API (Hono)              | Render free              | Blueprint (`render.yaml`) |
| Media                   | Cloudflare R2 (optional) | unchanged / manual        |
| Worker / queue-db / LLM | **not deployed**         | —                         |

The Oracle/Hetzner VM stack under `infra/vm/` remains available; flip back when
you want always-on jobs again.

## Prerequisites

1. Accounts: Neon, Vercel (GitHub app installed), Render (GitHub connected).
2. CLI: [OpenTofu](https://opentofu.org/) `>= 1.6` (Terraform `>= 1.6` also works).
3. API tokens in your shell (never commit):

```bash
export NEON_API_KEY=...
export VERCEL_API_TOKEN=...
# export VERCEL_TEAM_ID=...   # if the Vercel project lives on a team
```

## One-time apply

```bash
cd infra/paas
cp terraform.tfvars.example terraform.tfvars
# edit: neon_org_id (required), github_repo, neon_region_id, render_api_url
# neon_org_id: Neon Console → org switcher → Settings → General → Organization ID

tofu init
tofu plan
tofu apply
```

Then wire Render (Blueprint lives beside this stack):

1. Render Dashboard → **New** → **Blueprint** → select this repo → `infra/paas/render.yaml`
   (or copy/symlink `render.yaml` to the repo root if your Render account only
   scans `/render.yaml` — see note below).
2. Paste secrets into Render:

```bash
tofu output -raw database_url_pooled   # → Render DATABASE_URL
openssl rand -hex 32                   # → JWT_ACCESS_SECRET (≥32 chars)
openssl rand -hex 32                   # → OTP_PEPPER
# RESEND_API_KEY from resend.com; EMAIL_FROM must be a verified domain, e.g.
#   GymOS <onboarding@khubaibqaiesr.com>
# Never use resend.dev.
```

3. Migrate + seed (direct URL, from repo root). Seed needs `PILOT_COACH_PASSWORD`
   (≥12 chars) in the env you run seed with:

```bash
export DATABASE_URL="$(cd infra/paas && tofu output -raw database_url_direct)"
pnpm db:migrate && pnpm db:seed
```

4. Open the Vercel deployment → sign in as `coach@pilot.local` with the seed password.

### Blueprint path note

Render’s UI historically looks for `/render.yaml` at the repo root. This repo
keeps the Blueprint next to the OpenTofu stack for cohesion. Either:

- point the Blueprint at `infra/paas/render.yaml` when the UI allows a path, or
- `ln -s infra/paas/render.yaml render.yaml` at the repo root on the deploy branch.

## Day-2 changes (all from git)

| Change                             | Edit                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| Neon region / PG version / CU      | `neon.tf` / `terraform.tfvars` → `tofu apply`                   |
| Vercel build/root/API_ORIGIN       | `vercel.tf` / `variables.tf` → `tofu apply`                     |
| API env, region, plan, health path | `render.yaml` → push (autoDeploy)                               |
| Re-enable worker later             | abandon this path; use `infra/vm/` + set `PILOT_DEPLOY_ENABLED` |

## GitHub Actions

Workflow `.github/workflows/deploy-paas.yml` runs migrations on `main` when
`vars.PILOT_PAAS_DEPLOY_ENABLED=true`. App deploys are Git-driven (Vercel +
Render autoDeploy). Keep `PILOT_DEPLOY_ENABLED` (VM) **false** while on PaaS
so the two paths do not fight.

## Tradeoffs (intentional)

- Render free **spins down** after ~15 min idle → first request ~30–60s.
- No overdue auto-alerts / ranking learning until a VM worker returns.
- `AI_MODE=fallback` only (no local Qwen).
