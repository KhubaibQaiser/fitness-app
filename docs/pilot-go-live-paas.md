# Pilot go-live — free PaaS path (worker stripped)

Use this when you cannot get an Oracle VM and want **$0** hosting for a short
pilot. Full VM checklist remains in [`pilot-go-live.md`](./pilot-go-live.md).

Infrastructure is code under [`infra/paas/`](../infra/paas/) (OpenTofu + Render
Blueprint). Read that README for apply details.

## Tradeoffs (accepted)

- No `apps/worker` / pg-boss / queue-db → no nightly check-in roll, attention
  refresh, ranking refresh, or cleanup.
- Completing a check-in still schedules the next DUE row (request-path).
- `AI_MODE=fallback` only (template meal names).
- Render free cold starts after idle.

## 1. Accounts

- [ ] Neon, Vercel (GitHub app), Render (GitHub connected)
- [ ] OpenTofu ≥ 1.6; `NEON_API_KEY` + `VERCEL_API_TOKEN` in the shell

## 2. Apply IaC

```bash
cd infra/paas
cp terraform.tfvars.example terraform.tfvars   # fill secrets + github_repo
tofu init && tofu apply
```

- [ ] Render Blueprint from `infra/paas/render.yaml` (or root symlink)
- [ ] Render secrets: `DATABASE_URL` (pooled), `PILOT_ACCESS_KEY`, `GATE_COOKIE_SECRET`
- [ ] Confirm `API_ORIGIN` on Vercel matches the Render URL

## 3. GitHub

Repo → Settings → Environments → `production` (or repo Variables):

| Kind     | Name                        | Value                                                        |
| -------- | --------------------------- | ------------------------------------------------------------ |
| Secret   | `DATABASE_URL`              | Neon **direct** URL (`tofu output -raw database_url_direct`) |
| Variable | `PILOT_PAAS_DEPLOY_ENABLED` | `true`                                                       |
| Variable | `PILOT_DEPLOY_ENABLED`      | `false` (keep VM deploy off)                                 |

## 4. Data + smoke

```bash
DATABASE_URL=<direct> pnpm db:migrate
DATABASE_URL=<direct> pnpm db:seed
```

- [ ] Open `https://<vercel>/gate/enter?key=<PILOT_ACCESS_KEY>` on the coach phone
- [ ] Create client → generate draft plan → publish → complete a check-in
- [ ] First API call after idle may take 30–60s (Render spin-up)

## 5. Leaving this path

When you get a VM (Oracle / Hetzner): follow [`pilot-go-live.md`](./pilot-go-live.md),
set `PILOT_DEPLOY_ENABLED=true`, turn `PILOT_PAAS_DEPLOY_ENABLED` off, and tear
down or idle the Render/Vercel free services.
