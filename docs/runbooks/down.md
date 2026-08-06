# Runbook: app down (UptimeRobot alert on /health/live)

1. `ssh ubuntu@<vm>` → `docker compose -f /srv/gymos/compose.prod.yml ps` — anything restarting?
2. `docker compose -f /srv/gymos/compose.prod.yml logs --tail 100 api web caddy`
3. VM unreachable → check Oracle console (instance stopped = Always Free reclaim? see plan §18 quirks).
4. Bad deploy suspected → `/srv/gymos/deploy.sh --rollback`.
5. VM lost entirely → recreate from `infra/vm/cloud-init.yaml`, restore `.env` from GitHub Environments secrets, run the deploy workflow. Data is safe on Neon/R2.
