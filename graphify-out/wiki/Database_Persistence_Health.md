# Database Persistence Health

> 23 nodes · cohesion 0.11

## Key Concepts

- **enums.ts** (26 connections) — `packages/db/src/schema/enums.ts`
- **health.ts** (22 connections) — `packages/db/src/schema/health.ts`
- **outlets** (3 connections) — `packages/db/src/schema/tenancy.ts`
- **checkInStatusEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **feedbackKindEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **foodSourceEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **generationKindEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **generationStatusEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **goalPresetEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **goalRateEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **goalStatusEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **mealSlotEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **photoPoseEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **planStatusEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **restrictionTypeEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **roleEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **vitalsSourceEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **ADR-0014** (1 connections) — `packages/db/src/schema/health.ts`
- **ADR-0015** (1 connections) — `packages/db/src/schema/enums.ts`
- **checkIns** (1 connections) — `packages/db/src/schema/health.ts`
- **clientGoals** (1 connections) — `packages/db/src/schema/health.ts`
- **progressPhotos** (1 connections) — `packages/db/src/schema/health.ts`
- **vitals** (1 connections) — `packages/db/src/schema/health.ts`

## Relationships

- [Database Persistence Enums](Database_Persistence_Enums.md) (12 shared connections)
- [Database Persistence Nutrition](Database_Persistence_Nutrition.md) (9 shared connections)
- [Database Persistence 81](Database_Persistence_81.md) (6 shared connections)
- [Domain Modules](Domain_Modules.md) (2 shared connections)

## Source Files

- `packages/db/src/schema/enums.ts`
- `packages/db/src/schema/health.ts`
- `packages/db/src/schema/tenancy.ts`

## Audit Trail

- EXTRACTED: 57 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*