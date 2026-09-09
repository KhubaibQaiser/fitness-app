# Domain Modules Client

> 26 nodes · cohesion 0.16

## Key Concepts

- **checkins.ts** (48 connections) — `packages/modules/src/coaching/checkins.ts`
- **nowIso()** (36 connections) — `packages/db/src/time.ts`
- **completeCheckIn()** (20 connections) — `packages/modules/src/coaching/checkins.ts`
- **updateAndRerunCheckIn()** (18 connections) — `packages/modules/src/coaching/checkins.ts`
- **time.ts** (11 connections) — `packages/db/src/time.ts`
- **dbTimestampToMillis()** (11 connections) — `packages/db/src/time.ts`
- **recordVitals()** (10 connections) — `packages/modules/src/coaching/vitals.ts`
- **toStrictIso()** (5 connections) — `packages/db/src/time.ts`
- **assembleWeighIns()** (5 connections) — `packages/modules/src/coaching/checkins.ts`
- **upsertAttention()** (5 connections) — `packages/modules/src/coaching/checkins.ts`
- **hasMedicalFlags()** (4 connections) — `packages/db/src/schema/tenancy.ts`
- **parseDbTimestamp()** (4 connections) — `packages/db/src/time.ts`
- **checkInAsOf()** (4 connections) — `packages/modules/src/coaching/checkins.ts`
- **time.test.ts** (3 connections) — `packages/db/src/time.test.ts`
- **attentionReasonsFor()** (3 connections) — `packages/modules/src/coaching/checkins.ts`
- **loadCompletedCheckInWeights()** (3 connections) — `packages/modules/src/coaching/checkins.ts`
- **loadVitalSamples()** (3 connections) — `packages/modules/src/coaching/checkins.ts`
- **Tx** (2 connections) — `packages/db/src/client.ts`
- **todayIsoDate()** (1 connections) — `packages/db/src/time.ts`
- **CheckInError** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- **CheckInWeight** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- **checkInWithWeightSelect** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- **CompleteCheckInInput** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- **CompletedCheckIn** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- **DEFAULT_TARGETS** (1 connections) — `packages/modules/src/coaching/checkins.ts`
- *... and 1 more nodes in this community*

## Relationships

- [Domain Modules](Domain_Modules.md) (29 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (12 shared connections)
- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (9 shared connections)
- [Domain Modules Mail](Domain_Modules_Mail.md) (8 shared connections)
- [Domain Modules Http](Domain_Modules_Http.md) (8 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (7 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (6 shared connections)
- [Core Domain Logic Adaptive](Core_Domain_Logic_Adaptive.md) (5 shared connections)
- [Database Persistence Enums](Database_Persistence_Enums.md) (4 shared connections)
- [AI Nutrition Layer](AI_Nutrition_Layer.md) (4 shared connections)
- [Core Domain Logic Currency](Core_Domain_Logic_Currency.md) (4 shared connections)
- [Hono API Server](Hono_API_Server.md) (1 shared connections)

## Source Files

- `packages/db/src/client.ts`
- `packages/db/src/schema/tenancy.ts`
- `packages/db/src/time.test.ts`
- `packages/db/src/time.ts`
- `packages/modules/src/coaching/checkins.ts`
- `packages/modules/src/coaching/vitals.ts`

## Audit Trail

- EXTRACTED: 151 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*