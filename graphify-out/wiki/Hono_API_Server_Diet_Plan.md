# Hono API Server Diet Plan

> 12 nodes · cohesion 0.32

## Key Concepts

- **diet-plan-pdf.ts** (15 connections) — `apps/api/src/diet-plan-pdf.ts`
- **renderDietPlanPdf()** (8 connections) — `apps/api/src/diet-plan-pdf.ts`
- **writeBulletItem()** (5 connections) — `apps/api/src/diet-plan-pdf.ts`
- **writeLine()** (5 connections) — `apps/api/src/diet-plan-pdf.ts`
- **writeFlatSection()** (4 connections) — `apps/api/src/diet-plan-pdf.ts`
- **writeOptionSection()** (4 connections) — `apps/api/src/diet-plan-pdf.ts`
- **createSpacer()** (2 connections) — `apps/api/src/diet-plan-pdf.ts`
- **DietPlanPdfData** (2 connections) — `packages/modules/src/nutrition/plans.ts`
- **DietPlanPdfOption** (2 connections) — `packages/modules/src/nutrition/plans.ts`
- **MARGIN** (1 connections) — `apps/api/src/diet-plan-pdf.ts`
- **PdfDoc** (1 connections) — `apps/api/src/diet-plan-pdf.ts`
- **Spacer** (1 connections) — `apps/api/src/diet-plan-pdf.ts`

## Relationships

- [Domain Modules Diet Plan Pdf](Domain_Modules_Diet_Plan_Pdf.md) (6 shared connections)
- [Domain Modules Credentials Pdf](Domain_Modules_Credentials_Pdf.md) (1 shared connections)
- [Domain Modules](Domain_Modules.md) (1 shared connections)

## Source Files

- `apps/api/src/diet-plan-pdf.ts`
- `packages/modules/src/nutrition/plans.ts`

## Audit Trail

- EXTRACTED: 29 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*