# Ops Runbooks

> 9 nodes · cohesion 0.25

## Key Concepts

- **API Service** (5 connections) — `infra/vm/compose.prod.yml`
- **App Down Runbook** (4 connections) — `docs/runbooks/down.md`
- **Probes Must Hit /health/live Only** (3 connections) — `docs/runbooks/neon-cu-exhausted.md`
- **Neon Instant Restore** (3 connections) — `docs/runbooks/restore-from-backup.md`
- **Stateless Pet VM** (3 connections) — `infra/vm/cloud-init.yaml`
- **deploy.sh --rollback** (2 connections) — `docs/runbooks/down.md`
- **Error-Rate Spike Runbook** (2 connections) — `docs/runbooks/error-spike.md`
- **Neon Compute Quota Runbook** (2 connections) — `docs/runbooks/neon-cu-exhausted.md`
- **R2 Nightly pg_dump Fallback** (1 connections) — `docs/runbooks/restore-from-backup.md`

## Relationships

- [PaaS Infra Down](PaaS_Infra_Down.md) (3 shared connections)
- [Ops Runbooks Cert Renewal](Ops_Runbooks_Cert_Renewal.md) (2 shared connections)
- [Feature Specs](Feature_Specs.md) (1 shared connections)
- [Docs Interview Prep Pdf 120](Docs_Interview_Prep_Pdf_120.md) (1 shared connections)

## Source Files

- `docs/runbooks/down.md`
- `docs/runbooks/error-spike.md`
- `docs/runbooks/neon-cu-exhausted.md`
- `docs/runbooks/restore-from-backup.md`
- `infra/vm/cloud-init.yaml`
- `infra/vm/compose.prod.yml`

## Audit Trail

- EXTRACTED: 12 (75%)
- INFERRED: 4 (25%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*