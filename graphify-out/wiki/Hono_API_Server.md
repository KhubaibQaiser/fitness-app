# Hono API Server

> 52 nodes · cohesion 0.10

## Key Concepts

- **app.ts** (69 connections) — `apps/api/src/app.ts`
- **buildApp()** (34 connections) — `apps/api/src/app.ts`
- **route-bind.ts** (28 connections) — `apps/api/src/route-bind.ts`
- **me.ts** (25 connections) — `apps/api/src/routes/me.ts`
- **http.ts** (22 connections) — `apps/api/src/http.ts`
- **identity/index.ts** (21 connections) — `packages/modules/src/identity/index.ts`
- **auth-cookies.ts** (17 connections) — `apps/api/src/auth-cookies.ts`
- **ProblemError** (16 connections) — `apps/api/src/problems.ts`
- **rbac-http.ts** (14 connections) — `apps/api/src/rbac-http.ts`
- **problems.ts** (13 connections) — `apps/api/src/problems.ts`
- **app-deps.ts** (11 connections) — `apps/api/src/app-deps.ts`
- **registerMeRoutes()** (11 connections) — `apps/api/src/routes/me.ts`
- **RouteBind** (10 connections) — `apps/api/src/route-bind.ts`
- **TenantManifest** (10 connections) — `packages/modules/src/tenancy/manifest.ts`
- **clearAuthCookies()** (9 connections) — `apps/api/src/auth-cookies.ts`
- **jwt.ts** (8 connections) — `apps/api/src/auth/jwt.ts`
- **resolveUnitPrefs()** (8 connections) — `packages/core/src/units/convert.ts`
- **authorize()** (6 connections) — `apps/api/src/rbac-http.ts`
- **requireCoachId()** (6 connections) — `apps/api/src/rbac-http.ts`
- **AiConfig** (6 connections) — `packages/ai/src/types.ts`
- **unitPrefsToSystem()** (6 connections) — `packages/core/src/units/convert.ts`
- **Principal** (6 connections) — `packages/modules/src/identity/principal.ts`
- **resolvePrincipal()** (6 connections) — `packages/modules/src/identity/principal.ts`
- **revokeAllSessionsForUser()** (6 connections) — `packages/modules/src/identity/sessions.ts`
- **constants.ts** (5 connections) — `apps/api/src/auth/constants.ts`
- *... and 27 more nodes in this community*

## Relationships

- [Domain Modules Http](Domain_Modules_Http.md) (30 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (28 shared connections)
- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (22 shared connections)
- [Hono API Server Dev Pglite](Hono_API_Server_Dev_Pglite.md) (12 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (12 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (11 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (9 shared connections)
- [Domain Modules](Domain_Modules.md) (9 shared connections)
- [Domain Modules Mail](Domain_Modules_Mail.md) (7 shared connections)
- [AI Nutrition Layer](AI_Nutrition_Layer.md) (5 shared connections)
- [Core Domain Logic Actions](Core_Domain_Logic_Actions.md) (4 shared connections)
- [Core Domain Logic Convert](Core_Domain_Logic_Convert.md) (4 shared connections)

## Source Files

- `apps/api/package.json`
- `apps/api/src/app-deps.ts`
- `apps/api/src/app.ts`
- `apps/api/src/auth-cookies.ts`
- `apps/api/src/auth/constants.ts`
- `apps/api/src/auth/jwt.ts`
- `apps/api/src/http.ts`
- `apps/api/src/problems.ts`
- `apps/api/src/rate-limit.ts`
- `apps/api/src/rbac-http.ts`
- `apps/api/src/route-bind.ts`
- `apps/api/src/routes/me.ts`
- `packages/ai/src/types.ts`
- `packages/core/src/units/convert.ts`
- `packages/modules/src/identity/index.ts`
- `packages/modules/src/identity/principal.ts`
- `packages/modules/src/identity/sessions.ts`
- `packages/modules/src/tenancy/manifest.ts`

## Audit Trail

- EXTRACTED: 299 (99%)
- INFERRED: 3 (1%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*