# Domain Modules Coach Instructions

> 11 nodes · cohesion 0.31

## Key Concepts

- **nutrition/coach-instructions.ts** (19 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **getActiveInstructions()** (7 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **saveInstructions()** (7 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **registerCoachInstructionsRoutes()** (6 connections) — `apps/api/src/routes/coach-instructions.ts`
- **deriveInstructionsPlainText()** (4 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **sanitizeInstructionsText()** (3 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **coach-instructions.test.ts** (3 connections) — `packages/modules/src/nutrition/coach-instructions.test.ts`
- **stripMarkdownLine()** (2 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **CoachInstructions** (1 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **SaveInstructionsResult** (1 connections) — `packages/modules/src/nutrition/coach-instructions.ts`
- **ADR-0015** (1 connections) — `packages/modules/src/nutrition/coach-instructions.ts`

## Relationships

- [Domain Modules Http](Domain_Modules_Http.md) (4 shared connections)
- [Domain Modules](Domain_Modules.md) (4 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (4 shared connections)
- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (4 shared connections)
- [Hono API Server](Hono_API_Server.md) (2 shared connections)
- [AI Nutrition Layer](AI_Nutrition_Layer.md) (2 shared connections)

## Source Files

- `apps/api/src/routes/coach-instructions.ts`
- `packages/modules/src/nutrition/coach-instructions.test.ts`
- `packages/modules/src/nutrition/coach-instructions.ts`

## Audit Trail

- EXTRACTED: 36 (97%)
- INFERRED: 1 (3%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*