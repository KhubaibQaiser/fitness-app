# Domain Modules Http

> 22 nodes · cohesion 0.19

## Key Concepts

- **check-ins.ts** (27 connections) — `apps/api/src/routes/check-ins.ts`
- **registerCheckInRoutes()** (17 connections) — `apps/api/src/routes/check-ins.ts`
- **json()** (16 connections) — `apps/api/src/http.ts`
- **notifications.ts** (14 connections) — `apps/api/src/routes/notifications.ts`
- **notifications/index.ts** (14 connections) — `packages/modules/src/notifications/index.ts`
- **routes/coach-instructions.ts** (13 connections) — `apps/api/src/routes/coach-instructions.ts`
- **problemDocs()** (12 connections) — `apps/api/src/http.ts`
- **@hono/zod-openapi** (11 connections) — `apps/api/package.json`
- **GymosApp** (9 connections) — `apps/api/src/http.ts`
- **registerNotificationRoutes()** (8 connections) — `apps/api/src/routes/notifications.ts`
- **listPlans()** (7 connections) — `packages/modules/src/nutrition/plans.ts`
- **listCheckIns()** (6 connections) — `packages/modules/src/coaching/checkins.ts`
- **getCheckIn()** (3 connections) — `packages/modules/src/coaching/checkins.ts`
- **getCheckInDetail()** (3 connections) — `packages/modules/src/coaching/checkins.ts`
- **nextDueCheckIns()** (3 connections) — `packages/modules/src/coaching/goals.ts`
- **listNotifications()** (3 connections) — `packages/modules/src/notifications/index.ts`
- **markAllRead()** (3 connections) — `packages/modules/src/notifications/index.ts`
- **markRead()** (3 connections) — `packages/modules/src/notifications/index.ts`
- **unreadCount()** (3 connections) — `packages/modules/src/notifications/index.ts`
- **diffPlanItems()** (3 connections) — `packages/modules/src/nutrition/plans.ts`
- **ADR-0015** (1 connections) — `apps/api/src/routes/coach-instructions.ts`
- **NotificationType** (1 connections) — `packages/modules/src/notifications/index.ts`

## Relationships

- [Hono API Server](Hono_API_Server.md) (30 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (15 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (11 shared connections)
- [Domain Modules](Domain_Modules.md) (10 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (8 shared connections)
- [Domain Modules Client](Domain_Modules_Client.md) (8 shared connections)
- [Domain Modules Coach Instructions](Domain_Modules_Coach_Instructions.md) (4 shared connections)
- [Hono API Server Schemas](Hono_API_Server_Schemas.md) (4 shared connections)
- [Domain Modules Foods](Domain_Modules_Foods.md) (2 shared connections)
- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (1 shared connections)
- [Hono API Server Package](Hono_API_Server_Package.md) (1 shared connections)

## Source Files

- `apps/api/package.json`
- `apps/api/src/http.ts`
- `apps/api/src/routes/check-ins.ts`
- `apps/api/src/routes/coach-instructions.ts`
- `apps/api/src/routes/notifications.ts`
- `packages/modules/src/coaching/checkins.ts`
- `packages/modules/src/coaching/goals.ts`
- `packages/modules/src/notifications/index.ts`
- `packages/modules/src/nutrition/plans.ts`

## Audit Trail

- EXTRACTED: 137 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*