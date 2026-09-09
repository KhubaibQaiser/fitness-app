# Domain Modules Diet Plan Pdf

> 44 nodes · cohesion 0.09

## Key Concepts

- **nutrition/plans.ts** (74 connections) — `packages/modules/src/nutrition/plans.ts`
- **err** (30 connections) — `packages/core/src/shared/result.ts`
- **routes/plans.ts** (24 connections) — `apps/api/src/routes/plans.ts`
- **nutrition/foods.ts** (24 connections) — `packages/modules/src/nutrition/foods.ts`
- **generatePlan()** (23 connections) — `packages/modules/src/nutrition/plans.ts`
- **registerPlanRoutes()** (16 connections) — `apps/api/src/routes/plans.ts`
- **regenerateMeal()** (16 connections) — `packages/modules/src/nutrition/plans.ts`
- **getPlanWithItems()** (10 connections) — `packages/modules/src/nutrition/plans.ts`
- **publishPlan()** (10 connections) — `packages/modules/src/nutrition/plans.ts`
- **assertNoRestrictedFoods()** (9 connections) — `packages/core/src/nutrition/solver.ts`
- **restrictedAllergenCodes()** (8 connections) — `packages/modules/src/nutrition/dietary.ts`
- **getDietPlanPdfData()** (8 connections) — `packages/modules/src/nutrition/plans.ts`
- **candidatesForRestrictions()** (7 connections) — `packages/modules/src/nutrition/foods.ts`
- **patchPlan()** (7 connections) — `packages/modules/src/nutrition/plans.ts`
- **listFoods()** (4 connections) — `packages/modules/src/nutrition/foods.ts`
- **itemsForDaySlot()** (4 connections) — `packages/modules/src/nutrition/plans.ts`
- **dietPlanFilename()** (3 connections) — `apps/api/src/diet-plan-pdf.ts`
- **RestrictionInput** (3 connections) — `packages/modules/src/nutrition/dietary.ts`
- **unitsForFoods()** (3 connections) — `packages/modules/src/nutrition/foods.ts`
- **driftedDays()** (3 connections) — `packages/modules/src/nutrition/plans.ts`
- **optionsForSlot()** (3 connections) — `packages/modules/src/nutrition/plans.ts`
- **FoodGroup** (2 connections) — `packages/core/src/nutrition/solver.ts`
- **SolvedDay** (2 connections) — `packages/core/src/nutrition/solver.ts`
- **SolverError** (2 connections) — `packages/core/src/nutrition/solver.ts`
- **PlanOp** (2 connections) — `packages/modules/src/nutrition/plan-ops.ts`
- *... and 19 more nodes in this community*

## Relationships

- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (23 shared connections)
- [Core Domain Logic Solver](Core_Domain_Logic_Solver.md) (17 shared connections)
- [Domain Modules Http](Domain_Modules_Http.md) (15 shared connections)
- [Domain Modules](Domain_Modules.md) (15 shared connections)
- [Core Domain Logic Currency](Core_Domain_Logic_Currency.md) (13 shared connections)
- [Hono API Server](Hono_API_Server.md) (12 shared connections)
- [Domain Modules Foods](Domain_Modules_Foods.md) (10 shared connections)
- [Core Domain Logic](Core_Domain_Logic.md) (8 shared connections)
- [AI Nutrition Layer](AI_Nutrition_Layer.md) (8 shared connections)
- [Hono API Server Diet Plan](Hono_API_Server_Diet_Plan.md) (6 shared connections)
- [Domain Modules Client](Domain_Modules_Client.md) (6 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (4 shared connections)

## Source Files

- `apps/api/src/diet-plan-pdf.ts`
- `apps/api/src/routes/plans.ts`
- `packages/core/src/nutrition/solver.ts`
- `packages/core/src/shared/result.ts`
- `packages/modules/src/nutrition/dietary.ts`
- `packages/modules/src/nutrition/foods.ts`
- `packages/modules/src/nutrition/plan-ops.ts`
- `packages/modules/src/nutrition/plans.ts`

## Audit Trail

- EXTRACTED: 233 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*