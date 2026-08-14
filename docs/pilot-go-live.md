# Pilot go-live checklist ($0/month)

Everything below is a one-time, ~1-hour manual setup. Data lives on Neon/R2;
the VM is disposable.

> **No Oracle VM?** Use the stripped free PaaS path instead:
> [`pilot-go-live-paas.md`](./pilot-go-live-paas.md) + IaC in [`infra/paas/`](../infra/paas/).
> That path disables the worker (nightly jobs) and local LLM so web+API can run
> on Vercel + Render free tiers.

## 1. Accounts (all free)

- [ ] **Oracle Cloud** — Always Free; home region Singapore or Mumbai. Create one
      `VM.Standard.A1.Flex` (2 OCPU / 12 GB, Ubuntu 24.04) with
      [`infra/vm/cloud-init.yaml`](../infra/vm/cloud-init.yaml) as user data.
      A1 capacity errors at creation are common — retry/alternate AD (see plan §18).
      Open ingress 22/80/443 in the VCN security list.
- [ ] **DuckDNS** — claim a subdomain (e.g. `gymos-pilot`), point it at the VM's
      public IP, keep the token.
- [ ] **Neon** — free org; create project `gymos-pilot` (PG17, ap-southeast-1).
      Copy the pooled connection string (app) and direct string (migrations).
- [ ] **Cloudflare R2** — bucket `gymos-media-prod` (media + nightly dumps; wiring
      of photo uploads to R2 creds is pilot-hardening).
- [ ] Optional: **Sentry** (free) and **UptimeRobot** (free, monitor
      `https://<host>/health/live` every 5 min — NOT /health/ready).

## 2. GitHub configuration

Repo → Settings → Environments → `production`:

Secrets:

- [ ] `DATABASE_URL` — Neon **direct** URL (workflow migrations)
- [ ] `VM_HOST` — VM public IP
- [ ] `VM_SSH_KEY` — private key matching the VM's `ubuntu` user

Variables:

- [ ] `PILOT_DEPLOY_ENABLED` = `true` (gates the deploy job)

## 3. VM runtime env

Create `/srv/gymos/.env` (root-only, `chmod 600`):

```
PILOT_HOSTNAME=gymos-pilot.duckdns.org
DUCKDNS_TOKEN=<duckdns token>
DATABASE_URL=<neon POOLED url>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
OTP_PEPPER=<openssl rand -hex 32>
RESEND_API_KEY=re_...
EMAIL_FROM="GymOS <onboarding@khubaibqaiesr.com>"
QUEUE_DB_PASSWORD=<openssl rand -hex 16>
AI_MODE=fallback
```

`EMAIL_FROM` must use a **verified custom domain** (never `resend.dev`). The
mailbox does not need to exist. See [`runbooks/email-otp.md`](./runbooks/email-otp.md).

## 4. First deploy

- [ ] Push to `main` (or run the Deploy workflow manually). It builds images,
      runs migrations, ships compose+Caddyfile, and health-checks; failures
      auto-rollback.
- [ ] Seed once: from your machine
      `DATABASE_URL=<neon direct url> pnpm --filter @gymos/db db:seed`
- [ ] Open `https://<host>/enter` and sign in as `coach@pilot.local` (seed password),
      or create an account at `/signup`. Add to home screen (PWA).

## 5. Enabling the local LLM later (optional, still $0)

Download the Qwen3 GGUF onto the VM (`/srv/gymos/models`), un-comment the `llm`
service in `compose.prod.yml`, set `AI_MODE=local` and
`AI_BASE_URL=http://llm:8081/v1` in `.env`, redeploy. Fallback naming keeps
working if the model misbehaves — generation can never fail on the LLM.

### Smoke checklist

1. `docker compose -f compose.prod.yml ps` — `llm` healthy
2. From the API container: `wget -qO- http://llm:8081/v1/models` (or curl) returns model id
3. Generate a draft plan; `plan_generations.validation` should show `fellBack=false` when local is healthy
4. Kill the llm container briefly — generation still succeeds with `fellBack=true` / circuit may open after repeated failures

## 6. Day-2

- Runbooks: [`docs/runbooks/`](./runbooks/) — every alert has one.
- Rollback: `ssh ubuntu@<vm> '/srv/gymos/deploy.sh --rollback'`.
- Key rotation: update GitHub env + `/srv/gymos/.env`, redeploy. Rotating
  `JWT_ACCESS_SECRET` signs out everyone; rotating `OTP_PEPPER` invalidates
  outstanding signup/reset codes.
