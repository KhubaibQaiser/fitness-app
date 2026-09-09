# Ops Runbooks Cert Renewal

> 8 nodes · cohesion 0.29

## Key Concepts

- **Caddy TLS Reverse Proxy** (5 connections) — `infra/vm/compose.prod.yml`
- **DNS-01 via DuckDNS** (3 connections) — `docs/runbooks/cert-renewal.md`
- **Never Prune Docker Volumes Blindly** (3 connections) — `docs/runbooks/disk-full.md`
- **Ephemeral queue-db** (3 connections) — `infra/vm/compose.prod.yml`
- **TLS Certificate Issues Runbook** (2 connections) — `docs/runbooks/cert-renewal.md`
- **Let's Encrypt Staging CA Debug** (1 connections) — `docs/runbooks/cert-renewal.md`
- **VM Disk Full Runbook** (1 connections) — `docs/runbooks/disk-full.md`
- **Web Service** (1 connections) — `infra/vm/compose.prod.yml`

## Relationships

- [Ops Runbooks](Ops_Runbooks.md) (2 shared connections)
- [Docs Interview Prep Pdf](Docs_Interview_Prep_Pdf.md) (1 shared connections)

## Source Files

- `docs/runbooks/cert-renewal.md`
- `docs/runbooks/disk-full.md`
- `infra/vm/compose.prod.yml`

## Audit Trail

- EXTRACTED: 10 (91%)
- INFERRED: 1 (9%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*