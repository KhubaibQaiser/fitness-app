import { z } from '@hono/zod-openapi';

/** Request/response DTOs — the OpenAPI contract source. */

export const idParam = z.object({ id: z.uuid() });
export const clientIdParam = z.object({ clientId: z.uuid() });

export const macroTargetsSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  fiberG: z.number(),
});

export const createClientBody = z.object({
  name: z.string().min(1).max(120),
  sex: z.enum(['F', 'M']),
  dob: z.iso.date().optional(),
  phone: z.string().max(32).optional(),
  heightCm: z.number().min(100).max(230).optional(),
  activityLevel: z
    .union([z.literal(1.2), z.literal(1.375), z.literal(1.55), z.literal(1.725), z.literal(1.9)])
    .optional(),
  medicalFlags: z
    .object({ pregnant: z.boolean().optional(), conditions: z.array(z.string()).optional() })
    .optional(),
  intake: z.record(z.string(), z.string()).optional(),
});

export const updateClientBody = createClientBody.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
});

export const recordVitalsBody = z.object({
  recordedAt: z.iso.datetime({ offset: true }).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  bodyFatPct: z.number().min(2).max(70).optional(),
  muscleMassKg: z.number().min(5).max(120).optional(),
  chestCm: z.number().min(30).max(220).optional(),
  waistCm: z.number().min(30).max(220).optional(),
  hipCm: z.number().min(30).max(220).optional(),
  armCm: z.number().min(10).max(90).optional(),
  thighCm: z.number().min(20).max(120).optional(),
  restingHr: z.number().int().min(25).max(220).optional(),
  bpSystolic: z.number().int().min(60).max(260).optional(),
  bpDiastolic: z.number().int().min(30).max(180).optional(),
  notes: z.string().max(2000).optional(),
});

export const restrictionSchema = z.object({
  type: z.enum([
    'ALLERGY_SEVERE',
    'ALLERGY_MILD',
    'INTOLERANCE',
    'DISLIKE',
    'RELIGIOUS',
    'ETHICAL',
    'MEDICAL',
  ]),
  code: z.string().min(1).max(80),
  note: z.string().max(500).nullish(),
});

export const putDietaryBody = z.object({
  restrictions: z.array(restrictionSchema).max(50),
});

export const createGoalBody = z.object({
  preset: z.enum(['LOSE', 'GAIN', 'MAINTAIN', 'RECOMP']),
  rate: z.enum(['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE']),
  startWeightKg: z.number().min(20).max(400),
  targetWeightKg: z.number().min(20).max(400).optional(),
  targetDate: z.iso.date().optional(),
  checkinWeekday: z.number().int().min(0).max(6).optional(),
  bodyFatPct: z.number().min(2).max(70).optional(),
});

export const goalStatusBody = z.object({ status: z.enum(['ACHIEVED', 'ABANDONED']) });

export const completeCheckInBody = z.object({
  vitals: recordVitalsBody.optional(),
  adherenceRating: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  coachNotes: z.string().max(2000).optional(),
});

export const generateBody = z.object({
  override: z.object({ reason: z.string().min(5).max(500) }).optional(),
});

export const planOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('set-portion'),
    itemId: z.uuid(),
    portionGrams: z.number().min(1).max(3000),
  }),
  z.object({ op: z.literal('swap'), itemId: z.uuid(), foodId: z.uuid() }),
  z.object({ op: z.literal('remove'), itemId: z.uuid() }),
  z.object({
    op: z.literal('add'),
    day: z.number().int().min(1).max(7),
    mealIndex: z.number().int().min(0).max(6),
    mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    foodId: z.uuid(),
    portionGrams: z.number().min(1).max(3000),
  }),
]);

export const patchPlanBody = z.object({ ops: z.array(planOpSchema).min(1).max(50) });

export const noteBody = z.object({ body: z.string().min(1).max(4000) });

export const enterBody = z.object({ key: z.string().min(8).max(200) });

/** Loose-but-typed response envelopes (tightened in the contracts milestone). */
export const anyObject = z.record(z.string(), z.unknown());
export const objectList = z.object({ items: z.array(anyObject) });
export const okResponse = z.object({ ok: z.boolean() });

export type MacroTargets = z.infer<typeof macroTargetsSchema>;
