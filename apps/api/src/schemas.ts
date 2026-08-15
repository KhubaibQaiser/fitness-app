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

const clientIntakeObject = z.object({
  signaturePngBase64: z.string().min(40).max(2_000_000),
  signedAt: z.string().min(1).max(64),
  heightDisplayUnit: z.enum(['cm', 'ft_in']).optional(),
});

/** Required e-sign payload (onboarding). */
export const signedClientIntakeSchema = clientIntakeObject.openapi('SignedClientIntake');

/** Soft persisted shape — all fields optional. */
export const clientIntakeSchema = clientIntakeObject.partial().openapi('ClientIntake');

export const createClientBody = z.object({
  name: z.string().min(1).max(120),
  sex: z.enum(['F', 'M']),
  dob: z.iso.date().optional(),
  phone: z.string().max(32).optional(),
  email: z.email().max(254).optional(),
  heightCm: z.number().min(100).max(305).optional(),
  activityLevel: z
    .union([z.literal(1.2), z.literal(1.375), z.literal(1.55), z.literal(1.725), z.literal(1.9)])
    .optional(),
  medicalFlags: z
    .object({
      pregnant: z.boolean().optional(),
      conditions: z.array(z.string()).optional(),
      physicianClearanceRequired: z.boolean().optional(),
    })
    .optional(),
  intake: clientIntakeSchema.optional(),
});

export const updateClientBody = createClientBody.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
});

export const activityLevelSchema = z.union([
  z.literal(1.2),
  z.literal(1.375),
  z.literal(1.55),
  z.literal(1.725),
  z.literal(1.9),
]);

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

export const onboardClientBody = z.object({
  client: z.object({
    name: z.string().min(1).max(120),
    sex: z.enum(['F', 'M']),
    dob: z.iso.date().optional(),
    phone: z.string().max(32).optional(),
    email: z.email().max(254).optional(),
    heightCm: z.number().min(100).max(305),
    activityLevel: activityLevelSchema,
    medicalFlags: z
      .object({
        pregnant: z.boolean().optional(),
        conditions: z.array(z.string()).optional(),
        physicianClearanceRequired: z.boolean().optional(),
      })
      .optional(),
    intake: signedClientIntakeSchema,
  }),
  vitals: z.object({
    weightKg: z.number().min(20).max(400),
    bodyFatPct: z.number().min(2).max(70).optional(),
    chestCm: z.number().min(30).max(220).optional(),
    waistCm: z.number().min(30).max(220).optional(),
    hipCm: z.number().min(30).max(220).optional(),
    armCm: z.number().min(10).max(90).optional(),
    armLeftCm: z.number().min(10).max(90).optional(),
    armRightCm: z.number().min(10).max(90).optional(),
    thighCm: z.number().min(20).max(120).optional(),
    thighLeftCm: z.number().min(20).max(120).optional(),
    thighRightCm: z.number().min(20).max(120).optional(),
  }),
  goal: z.object({
    preset: z.enum(['LOSE', 'GAIN', 'MAINTAIN', 'RECOMP']),
    rate: z.enum(['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE']),
    startWeightKg: z.number().min(20).max(400),
    targetWeightKg: z.number().min(20).max(400),
    targetDate: z.iso.date().optional(),
    checkinWeekday: z.number().int().min(0).max(6).optional(),
    bodyFatPct: z.number().min(2).max(70).optional(),
  }),
  dietary: z.array(restrictionSchema).max(50).optional(),
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
  armLeftCm: z.number().min(10).max(90).optional(),
  armRightCm: z.number().min(10).max(90).optional(),
  thighCm: z.number().min(20).max(120).optional(),
  thighLeftCm: z.number().min(20).max(120).optional(),
  thighRightCm: z.number().min(20).max(120).optional(),
  restingHr: z.number().int().min(25).max(220).optional(),
  bpSystolic: z.number().int().min(60).max(260).optional(),
  bpDiastolic: z.number().int().min(30).max(180).optional(),
  notes: z.string().max(2000).optional(),
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

export const saveActiveGoalBody = z.object({
  activityLevel: activityLevelSchema,
  preset: z.enum(['LOSE', 'GAIN', 'MAINTAIN', 'RECOMP']),
  rate: z.enum(['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE']),
  startWeightKg: z.number().min(20).max(400),
  targetWeightKg: z.number().min(20).max(400),
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
  mealCount: z.union([z.literal(3), z.literal(4), z.literal(5)]).default(3),
  idempotencyKey: z.string().min(8).max(128).optional(),
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
  z.object({
    op: z.literal('override-macros'),
    itemId: z.uuid(),
    macros: z.object({
      kcal: z.number().min(0).max(10000),
      proteinG: z.number().min(0).max(1000),
      fatG: z.number().min(0).max(1000),
      carbsG: z.number().min(0).max(1000),
    }),
    reason: z.string().min(1).max(500).optional(),
  }),
  z.object({
    op: z.literal('apply-day-to-week'),
    day: z.number().int().min(1).max(7),
  }),
  z.object({
    op: z.literal('set-title'),
    title: z.string().max(50),
  }),
]);

export const patchPlanBody = z.object({ ops: z.array(planOpSchema).min(1).max(50) });

export const publishBody = z.object({
  reviewed: z.literal(true),
  acknowledgeDrift: z.boolean().optional(),
});

export const noteBody = z.object({ body: z.string().min(1).max(4000) });

export const enterBody = z.object({ key: z.string().min(8).max(200) });
export const loginBody = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(200),
});
export const refreshBody = z.object({
  refreshToken: z.string().min(16).max(500).optional(),
});

export const signupCoachStartBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320),
  phone: z.string().trim().min(7).max(32),
  password: z.string().min(8).max(200),
  joinCode: z.string().trim().min(4).max(16).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const signupCoachConfirmBody = z.object({
  email: z.email().max(320),
  code: z.string().regex(/^\d{6}$/),
});

export const signupCoachResendBody = z.object({
  email: z.email().max(320),
});

export const forgotPasswordBody = z.object({
  email: z.email().max(320),
});

export const resetPasswordBody = z.object({
  email: z.email().max(320),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(200),
});

const unitPrefsSchema = z.object({
  weight: z.enum(['kg', 'lb']),
  height: z.enum(['cm', 'ft_in']),
  length: z.enum(['cm', 'in']),
});

export const updateMeBody = z
  .object({
    locale: z.enum(['en', 'ur']).optional(),
    currencyPref: z.enum(['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']).optional(),
    unitPrefs: unitPrefsSchema.optional(),
    defaultCountry: z
      .string()
      .length(2)
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .refine(
    (body) =>
      body.locale !== undefined ||
      body.currencyPref !== undefined ||
      body.unitPrefs !== undefined ||
      body.defaultCountry !== undefined,
    { message: 'Provide at least one preference to update' },
  );

/** Loose-but-typed response envelopes (tightened in the contracts milestone). */
export const anyObject = z.record(z.string(), z.unknown());
export const objectList = z.object({ items: z.array(anyObject) });
export const okResponse = z.object({ ok: z.boolean() });

export type MacroTargets = z.infer<typeof macroTargetsSchema>;
