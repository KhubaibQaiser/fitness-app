# ADR-0003: Shared-schema multi-tenant isolation

- Status: Accepted
- Date: 2026-08-11
- Deciders: GymOS platform

## Context

The schema already models `organizations` → `outlets` → clients/coaches, but
list queries did not filter by tenant scope, several client-scoped tables lacked
`outlet_id`, and rate limiting was in-process only. A second organization would
have leaked data and broken horizontal API scale.

## Decision

1. **Application-level scoping is primary** — `listClients` / `nextDueCheckIns`
   filter by `orgWide` → org, else `outletIds`, else `assignedClientIds`.
2. **Denormalize `outlet_id`** onto `check_ins`, `client_goals`, `coach_notes`,
   `client_dietary_profiles`, `plan_generations` (backfilled from `clients`).
3. **Postgres RLS policies** on tenant tables, driven by session GUCs
   (`app.org_wide`, `app.outlet_ids`, `app.assigned_client_ids`). ENABLE without
   FORCE for now — the pilot connection is typically the table owner (bypasses
   RLS). FORCE lands when a dedicated non-owner API role exists.
4. **Postgres `rate_limits` table** for login throttling (no Redis in stack).

## Consequences

- Inserts into backfilled tables must stamp `outlet_id`.
- Cross-tenant isolation tests must seed a second org and assert empty lists.
- Dedicated API DB role + FORCE RLS is a follow-up hardening item.
