# Domain Modules App

> 44 nodes · cohesion 0.07

## Key Concepts

- **tenancy/manifest.ts** (20 connections) — `packages/modules/src/tenancy/manifest.ts`
- **tenant-isolation.test.ts** (18 connections) — `apps/api/tests/tenant-isolation.test.ts`
- **tenancy/index.ts** (18 connections) — `packages/modules/src/tenancy/index.ts`
- **auth-signup.test.ts** (17 connections) — `apps/api/tests/auth-signup.test.ts`
- **pilot-loop.test.ts** (17 connections) — `apps/api/tests/pilot-loop.test.ts`
- **principal.ts** (17 connections) — `packages/modules/src/identity/principal.ts`
- **registry.ts** (16 connections) — `packages/modules/src/tenancy/registry.ts`
- **generate-openapi.ts** (13 connections) — `apps/api/src/cli/generate-openapi.ts`
- **tenantManifestSchema** (8 connections) — `packages/modules/src/tenancy/manifest.ts`
- **weeklyDeltaKgFromManifest()** (7 connections) — `packages/modules/src/tenancy/manifest.ts`
- **getManifestForOrg()** (5 connections) — `packages/modules/src/tenancy/registry.ts`
- **App** (4 connections) — `apps/api/src/app.ts`
- **resetPrincipalCache()** (4 connections) — `packages/modules/src/identity/principal.ts`
- **resetManifestCache()** (4 connections) — `packages/modules/src/tenancy/manifest.ts`
- **readManifestFile()** (4 connections) — `packages/modules/src/tenancy/registry.ts`
- **resetRegistryCache()** (4 connections) — `packages/modules/src/tenancy/registry.ts`
- **syncSingleOrgRegistryFromFile()** (4 connections) — `packages/modules/src/tenancy/registry.ts`
- **syncTenantConfigFromFile()** (4 connections) — `packages/modules/src/tenancy/registry.ts`
- **upsertTenantConfig()** (4 connections) — `packages/modules/src/tenancy/registry.ts`
- **resolvePilotCoachPrincipal()** (3 connections) — `packages/modules/src/identity/principal.ts`
- **manifest.test.ts** (3 connections) — `packages/modules/src/tenancy/manifest.test.ts`
- **getManifestBySlug()** (3 connections) — `packages/modules/src/tenancy/registry.ts`
- **WeeklyDeltaKgTable** (2 connections) — `packages/core/src/nutrition/layer1.ts`
- **CURRENCY_CODES** (2 connections) — `packages/modules/src/tenancy/manifest.ts`
- **CurrencyCode** (2 connections) — `packages/modules/src/tenancy/manifest.ts`
- *... and 19 more nodes in this community*

## Relationships

- [Hono API Server](Hono_API_Server.md) (28 shared connections)
- [Domain Modules](Domain_Modules.md) (24 shared connections)
- [Hono API Server Dev Pglite](Hono_API_Server_Dev_Pglite.md) (5 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (5 shared connections)
- [Domain Modules Mail](Domain_Modules_Mail.md) (4 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (4 shared connections)
- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (3 shared connections)
- [Coach App UI Goal Delta](Coach_App_UI_Goal_Delta.md) (3 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (2 shared connections)
- [Core Domain Logic](Core_Domain_Logic.md) (2 shared connections)
- [Core Domain Logic Actions](Core_Domain_Logic_Actions.md) (2 shared connections)
- [Coach App UI Goal Energy](Coach_App_UI_Goal_Energy.md) (2 shared connections)

## Source Files

- `apps/api/src/app.ts`
- `apps/api/src/cli/generate-openapi.ts`
- `apps/api/tests/auth-signup.test.ts`
- `apps/api/tests/pilot-loop.test.ts`
- `apps/api/tests/tenant-isolation.test.ts`
- `node:fs`
- `packages/core/src/nutrition/layer1.ts`
- `packages/modules/src/identity/principal.ts`
- `packages/modules/src/tenancy/index.ts`
- `packages/modules/src/tenancy/manifest.test.ts`
- `packages/modules/src/tenancy/manifest.ts`
- `packages/modules/src/tenancy/registry.ts`

## Audit Trail

- EXTRACTED: 154 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*