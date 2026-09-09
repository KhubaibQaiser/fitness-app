# Domain Modules Vitals Goals

> 46 nodes · cohesion 0.08

## Key Concepts

- **coaching/clients.ts** (42 connections) — `packages/modules/src/coaching/clients.ts`
- **goals.ts** (40 connections) — `packages/modules/src/coaching/goals.ts`
- **dietary.ts** (23 connections) — `packages/modules/src/nutrition/dietary.ts`
- **vitals-goals.ts** (22 connections) — `apps/api/src/routes/vitals-goals.ts`
- **writeAudit()** (20 connections) — `packages/modules/src/shared/audit.ts`
- **registerVitalsGoalRoutes()** (14 connections) — `apps/api/src/routes/vitals-goals.ts`
- **DbOrTx** (11 connections) — `packages/db/src/client.ts`
- **createGoalTx()** (11 connections) — `packages/modules/src/coaching/goals.ts`
- **audit.ts** (11 connections) — `packages/modules/src/shared/audit.ts`
- **onboardClient()** (10 connections) — `packages/modules/src/coaching/clients.ts`
- **saveActiveGoal()** (10 connections) — `packages/modules/src/coaching/goals.ts`
- **core/src/index.ts** (9 connections) — `packages/core/src/index.ts`
- **getActiveProfile()** (9 connections) — `packages/modules/src/nutrition/dietary.ts`
- **putProfile()** (7 connections) — `packages/modules/src/nutrition/dietary.ts`
- **ClientIntake** (6 connections) — `packages/core/src/shared/client-intake.ts`
- **computeGoalTargets()** (6 connections) — `packages/modules/src/coaching/goals.ts`
- **createGoal()** (6 connections) — `packages/modules/src/coaching/goals.ts`
- **writeDietaryProfileTx()** (6 connections) — `packages/modules/src/nutrition/dietary.ts`
- **client-intake.ts** (5 connections) — `packages/core/src/shared/client-intake.ts`
- **setGoalStatus()** (4 connections) — `packages/modules/src/coaching/goals.ts`
- **SignedClientIntake** (3 connections) — `packages/core/src/shared/client-intake.ts`
- **OnboardAbortError** (3 connections) — `packages/modules/src/coaching/clients.ts`
- **listGoals()** (3 connections) — `packages/modules/src/coaching/goals.ts`
- **profileMissing()** (3 connections) — `packages/modules/src/coaching/goals.ts`
- **RecordVitalsInput** (3 connections) — `packages/modules/src/coaching/vitals.ts`
- *... and 21 more nodes in this community*

## Relationships

- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (24 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (23 shared connections)
- [Domain Modules](Domain_Modules.md) (21 shared connections)
- [Domain Modules Client](Domain_Modules_Client.md) (12 shared connections)
- [Hono API Server](Hono_API_Server.md) (11 shared connections)
- [Core Domain Logic Currency](Core_Domain_Logic_Currency.md) (10 shared connections)
- [Domain Modules Http](Domain_Modules_Http.md) (8 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (5 shared connections)
- [Domain Modules Coach Instructions](Domain_Modules_Coach_Instructions.md) (4 shared connections)
- [Core Domain Logic Actions](Core_Domain_Logic_Actions.md) (4 shared connections)
- [Core Domain Logic](Core_Domain_Logic.md) (4 shared connections)
- [OpenAPI Contracts](OpenAPI_Contracts.md) (3 shared connections)

## Source Files

- `apps/api/src/routes/vitals-goals.ts`
- `packages/core/src/index.ts`
- `packages/core/src/shared/client-intake.ts`
- `packages/core/src/shared/index.ts`
- `packages/db/src/client.ts`
- `packages/modules/src/coaching/clients.ts`
- `packages/modules/src/coaching/goals.ts`
- `packages/modules/src/coaching/vitals.ts`
- `packages/modules/src/nutrition/dietary.test.ts`
- `packages/modules/src/nutrition/dietary.ts`
- `packages/modules/src/shared/audit.ts`

## Audit Trail

- EXTRACTED: 227 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*