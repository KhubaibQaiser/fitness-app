# Database Persistence 81

> 13 nodes · cohesion 0.15

## Key Concepts

- **ops.ts** (19 connections) — `packages/db/src/schema/ops.ts`
- **clients** (4 connections) — `packages/db/src/schema/tenancy.ts`
- **users** (4 connections) — `packages/db/src/schema/tenancy.ts`
- **notificationPriorityEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **notificationTypeEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **otpPurposeEnum** (2 connections) — `packages/db/src/schema/enums.ts`
- **auditLog** (1 connections) — `packages/db/src/schema/ops.ts`
- **clientAttention** (1 connections) — `packages/db/src/schema/ops.ts`
- **idempotencyKeys** (1 connections) — `packages/db/src/schema/ops.ts`
- **notifications** (1 connections) — `packages/db/src/schema/ops.ts`
- **otpChallenges** (1 connections) — `packages/db/src/schema/ops.ts`
- **rateLimits** (1 connections) — `packages/db/src/schema/ops.ts`
- **sessions** (1 connections) — `packages/db/src/schema/ops.ts`

## Relationships

- [Database Persistence Enums](Database_Persistence_Enums.md) (7 shared connections)
- [Database Persistence Health](Database_Persistence_Health.md) (6 shared connections)
- [Database Persistence Nutrition](Database_Persistence_Nutrition.md) (2 shared connections)
- [Domain Modules](Domain_Modules.md) (1 shared connections)

## Source Files

- `packages/db/src/schema/enums.ts`
- `packages/db/src/schema/ops.ts`
- `packages/db/src/schema/tenancy.ts`

## Audit Trail

- EXTRACTED: 28 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*