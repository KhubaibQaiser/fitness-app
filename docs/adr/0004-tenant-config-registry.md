# ADR-0004: Per-org tenant config registry

- Status: Accepted
- Date: 2026-08-11
- Deciders: GymOS platform

## Context

Tenant branding, locales, units, currency, and AI knobs lived in a single JSON
file (`infra/tenants/pilot.json`) loaded once into a **process-global** cache via
`loadManifest(path)`. That is correct for one gym and incorrect the moment a
second organization needs different cuisine context, quota, or brand colors.
Coach mobile, client, and gym-admin apps all need org-scoped config from the
same API.

## Decision

1. **Store manifests in Postgres** — `tenant_configs` keyed by `org_id` (PK) with
   a unique `slug` and a jsonb `manifest` column matching the existing Zod schema.
2. **Load by org at request time** — authenticated handlers resolve config via
   `getManifestForOrg(db, principal.orgId)` with a short in-memory TTL cache
   keyed by org id (not a single process-wide file).
3. **File remains the seed / bootstrap source** — `infra/tenants/*.json` is still
   committed config-as-code for the pilot; seed and API cold-start upsert into
   the registry. `loadManifest(path)` is retained only for OpenAPI generation
   and environments with no DB yet.
4. **Public config** may resolve by `?slug=` from the registry; otherwise the
   bootstrap file manifest is returned (anonymous surface).

## Consequences

- New orgs need a `tenant_configs` row before AI / locale-sensitive routes work.
- Changing a JSON file in git does not update a live DB until re-seed / upsert /
  admin tooling writes the registry.
- Schema-per-tenant and DB-per-tenant remain explicitly deferred (see ADR-0003).
