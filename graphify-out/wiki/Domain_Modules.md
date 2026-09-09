# Domain Modules

> 64 nodes · cohesion 0.06

## Key Concepts

- **db/src/index.ts** (50 connections) — `packages/db/src/index.ts`
- **Db** (40 connections) — `packages/db/src/client.ts`
- **schema** (39 connections) — `packages/db/src/index.ts`
- **src/seed.ts** (21 connections) — `packages/db/src/seed.ts`
- **worker/src/index.ts** (17 connections) — `apps/worker/src/index.ts`
- **seed()** (17 connections) — `packages/db/src/seed.ts`
- **iso()** (17 connections) — `packages/db/src/time.ts`
- **checkins.test.ts** (17 connections) — `packages/modules/src/coaching/checkins.test.ts`
- **ai-kpis.ts** (16 connections) — `packages/modules/src/nutrition/ai-kpis.ts`
- **modules/src/nutrition/index.ts** (15 connections) — `packages/modules/src/nutrition/index.ts`
- **checkins-roll.ts** (13 connections) — `apps/worker/src/jobs/checkins-roll.ts`
- **db/src/client.ts** (13 connections) — `packages/db/src/client.ts`
- **ranking-refresh.ts** (13 connections) — `packages/modules/src/nutrition/ranking-refresh.ts`
- **schema/index.ts** (10 connections) — `packages/db/src/schema/index.ts`
- **foods.test.ts** (10 connections) — `packages/modules/src/nutrition/foods.test.ts`
- **isoDate()** (9 connections) — `packages/db/src/time.ts`
- **notify()** (9 connections) — `packages/modules/src/notifications/index.ts`
- **cli/seed.ts** (8 connections) — `packages/db/src/cli/seed.ts`
- **ai-retention.ts** (8 connections) — `packages/modules/src/nutrition/ai-retention.ts`
- **otp.test.ts** (7 connections) — `packages/modules/src/identity/otp.test.ts`
- **schema.test.ts** (6 connections) — `packages/db/src/schema.test.ts`
- **refreshFoodRankings()** (5 connections) — `packages/modules/src/nutrition/ranking-refresh.ts`
- **cleanupExpired()** (4 connections) — `apps/worker/src/jobs/checkins-roll.ts`
- **rollCheckIns()** (4 connections) — `apps/worker/src/jobs/checkins-roll.ts`
- **migrate.ts** (4 connections) — `packages/db/src/cli/migrate.ts`
- *... and 39 more nodes in this community*

## Relationships

- [Domain Modules Client](Domain_Modules_Client.md) (29 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (24 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (21 shared connections)
- [Domain Modules Mail](Domain_Modules_Mail.md) (16 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (15 shared connections)
- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (14 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (12 shared connections)
- [Domain Modules Http](Domain_Modules_Http.md) (10 shared connections)
- [Hono API Server](Hono_API_Server.md) (9 shared connections)
- [AI Nutrition Layer](AI_Nutrition_Layer.md) (5 shared connections)
- [Hono API Server Dev Pglite](Hono_API_Server_Dev_Pglite.md) (5 shared connections)
- [Domain Modules Coach Instructions](Domain_Modules_Coach_Instructions.md) (4 shared connections)

## Source Files

- `apps/worker/package.json`
- `apps/worker/src/index.ts`
- `apps/worker/src/jobs/checkins-roll.ts`
- `packages/db/src/cli/migrate.ts`
- `packages/db/src/cli/seed.ts`
- `packages/db/src/client.ts`
- `packages/db/src/index.ts`
- `packages/db/src/schema.test.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/seed.ts`
- `packages/db/src/time.ts`
- `packages/modules/src/coaching/checkins.test.ts`
- `packages/modules/src/identity/otp.test.ts`
- `packages/modules/src/notifications/index.ts`
- `packages/modules/src/nutrition/ai-kpis.ts`
- `packages/modules/src/nutrition/ai-retention.ts`
- `packages/modules/src/nutrition/foods.test.ts`
- `packages/modules/src/nutrition/index.ts`
- `packages/modules/src/nutrition/ranking-refresh.ts`

## Audit Trail

- EXTRACTED: 313 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*