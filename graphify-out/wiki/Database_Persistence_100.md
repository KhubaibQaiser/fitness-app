# Database Persistence 100

> 8 nodes · cohesion 0.25

## Key Concepts

- **seed-data/foods.ts** (9 connections) — `packages/db/src/seed-data/foods.ts`
- **DietaryFlags** (2 connections) — `packages/db/src/schema/nutrition.ts`
- **Per100g** (2 connections) — `packages/db/src/schema/nutrition.ts`
- **FOOD_SEED** (2 connections) — `packages/db/src/seed-data/foods.ts`
- **FoodSeed** (1 connections) — `packages/db/src/seed-data/foods.ts`
- **halal()** (1 connections) — `packages/db/src/seed-data/foods.ts`
- **MealSlotSeed** (1 connections) — `packages/db/src/seed-data/foods.ts`
- **ADR-0015** (1 connections) — `packages/db/src/seed-data/foods.ts`

## Relationships

- [Database Persistence Nutrition](Database_Persistence_Nutrition.md) (3 shared connections)
- [Domain Modules](Domain_Modules.md) (2 shared connections)

## Source Files

- `packages/db/src/schema/nutrition.ts`
- `packages/db/src/seed-data/foods.ts`

## Audit Trail

- EXTRACTED: 12 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*