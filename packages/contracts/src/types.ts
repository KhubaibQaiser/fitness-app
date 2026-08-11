/**
 * Hand-maintained response/request types mirroring the server DTOs.
 * TODO(pilot-hardening): replace with hey-api codegen from openapi.v1.json
 * with a CI drift gate (plan §9); the transport below already matches it.
 */

import { type ClientIntake, type SignedClientIntake } from '@gymos/core';

export type { ClientIntake, SignedClientIntake };

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR';
export type LocaleCode = 'en' | 'ur';

export type PublicConfig = {
  appName: string;
  colors: { primary: string; accent: string };
  radius: 'sharp' | 'soft' | 'round';
  terminology: Record<string, string>;
  locales: { default: LocaleCode; enabled: LocaleCode[] };
  units: 'metric' | 'imperial';
  currency: CurrencyCode;
  currencies: CurrencyCode[];
};

export type Me = {
  userId: string;
  name: string;
  email: string | null;
  locale: LocaleCode;
  unitPref: 'metric' | 'imperial';
  currencyPref: CurrencyCode;
  roles: string[];
};

/** Response from /v1/auth/login and /v1/auth/refresh. */
export type AuthTokens = {
  accessToken: string;
  expiresIn: number;
  /** Present for mobile clients and also echoed for web (cookie is authoritative on web). */
  refreshToken?: string;
  me: Me;
};

export type UpdateMeInput = {
  locale?: LocaleCode;
  currencyPref?: CurrencyCode;
};

export type AttentionReason = { code: string; weight: number; since: string };

export type ClientListItem = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  attentionScore: number;
  attentionReasons: AttentionReason[];
  latestWeightKg: number | null;
  goalPreset: string | null;
};

export type Client = {
  id: string;
  name: string;
  sex: 'F' | 'M';
  dob: string | null;
  phone: string | null;
  email: string | null;
  heightCm: number | null;
  activityLevel: number | null;
  medicalFlags: {
    pregnant?: boolean;
    conditions?: string[];
    physicianClearanceRequired?: boolean;
  } | null;
  intake: ClientIntake | null;
  status: 'active' | 'archived';
  createdAt: string;
};

export type MacroTargets = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

export type Goal = {
  id: string;
  preset: 'LOSE' | 'GAIN' | 'MAINTAIN' | 'RECOMP';
  rate: 'CONSERVATIVE' | 'STANDARD' | 'AGGRESSIVE';
  startDate: string;
  startWeightKg: number;
  targetWeightKg: number | null;
  targetDate: string | null;
  expectedWeeklyDeltaKg: number;
  initialTargets: MacroTargets | null;
  tdeeEstimate: number | null;
  checkinWeekday: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'ABANDONED' | 'SUPERSEDED';
};

export type Vitals = {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  restingHr: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  notes: string | null;
};

export type OnboardClientInput = {
  client: {
    name: string;
    sex: 'F' | 'M';
    dob?: string;
    phone?: string;
    email?: string;
    heightCm: number;
    activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
    medicalFlags?: {
      pregnant?: boolean;
      conditions?: string[];
      physicianClearanceRequired?: boolean;
    };
    intake: SignedClientIntake;
  };
  vitals: {
    weightKg: number;
    bodyFatPct?: number;
    chestCm?: number;
    waistCm?: number;
    hipCm?: number;
    armCm?: number;
    thighCm?: number;
  };
  goal: {
    preset: Goal['preset'];
    rate: Goal['rate'];
    startWeightKg: number;
    targetWeightKg?: number;
    targetDate?: string;
    checkinWeekday?: number;
    bodyFatPct?: number;
  };
};

export type OnboardClientResult = {
  client: Client;
  vitals: Vitals;
  goal: Goal;
};

export type Restriction = {
  type:
    | 'ALLERGY_SEVERE'
    | 'ALLERGY_MILD'
    | 'INTOLERANCE'
    | 'DISLIKE'
    | 'RELIGIOUS'
    | 'ETHICAL'
    | 'MEDICAL';
  code: string;
  note?: string | null;
};

export type DietaryProfile = {
  id: string;
  version: number;
  restrictions: Restriction[];
} | null;

export type PlanSummary = {
  id: string;
  version: number;
  title: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'NEEDS_REVIEW' | 'ARCHIVED';
  targets: MacroTargets;
  publishedAt: string | null;
};

export type PlanItem = {
  id: string;
  day: number;
  mealIndex: number;
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealName: string;
  foodName: string;
  foodId: string;
  portionGrams: number;
  macros: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  macrosSource: 'food_db' | 'coach_override';
  prepNotes: string | null;
  position: number;
};

export type PlanWithItems = { plan: PlanSummary & { clientId: string }; items: PlanItem[] };

export type CheckIn = {
  id: string;
  clientId: string;
  goalId: string;
  scheduledFor: string;
  completedAt: string | null;
  vitalsId: string | null;
  adherenceRating: number | null;
  coachNotes: string | null;
  engineOutput: Verdict | null;
  status: 'DUE' | 'COMPLETED' | 'SKIPPED';
  /** Present on GET /v1/check-ins/{id} when a vitals row is linked. */
  weightKg?: number | null;
};

export type DueCheckIn = {
  id: string;
  clientId: string;
  clientName: string;
  goalId: string;
  scheduledFor: string;
  status: string;
  overdueDays: number;
};

export type Verdict = {
  type:
    | 'INSUFFICIENT_DATA'
    | 'HOLD'
    | 'ADHERENCE_FOCUS'
    | 'PLATEAU_PROTOCOL'
    | 'ADJUST_TARGETS'
    | 'REFER_REVIEW';
  confidence: number;
  reasons: string[];
  actualWeeklyDeltaKg?: number;
  expectedWeeklyDeltaKg?: number;
  observedTdeeEstimate?: number;
  deltaKcalPerDay?: number;
  newTargets?: MacroTargets;
  clampedBySafety?: boolean;
  meanAdherence?: number;
  flags?: string[];
  /** Layer-3 adaptive narrative (digit-free); optional on older rows. */
  narrative?: {
    title: string;
    coachSummary: string;
    clientSummary: string;
  };
};

export type ClientDetail = {
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  goalProgressPct: number | null;
  dietaryProfile: DietaryProfile;
  plans: PlanSummary[];
  recentCheckIns: CheckIn[];
};

export type Food = {
  id: string;
  name: string;
  nameUr: string | null;
  foodGroup: string;
  per100g: { kcal: number; proteinG: number; fatG: number; carbsG: number; fiberG: number };
  allergenTags: string[];
  servingUnits: { name: string; grams: number }[];
};

export type Notification = {
  id: string;
  type: string;
  priority: 'HIGH' | 'NORMAL';
  payload: Record<string, unknown>;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
};

export type PlanDiffEntry = {
  day: number;
  slot: string;
  foodId: string;
  foodName: string;
  kind: 'portion' | 'added' | 'removed';
  fromGrams?: number;
  toGrams?: number;
  kcalDelta: number;
};

export type ApplyResult = {
  plan: PlanSummary & { clientId: string };
  items: PlanItem[];
  diff: PlanDiffEntry[];
};

export type Problem = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
};

export type PlanOp =
  | { op: 'set-portion'; itemId: string; portionGrams: number }
  | { op: 'swap'; itemId: string; foodId: string }
  | { op: 'remove'; itemId: string }
  | {
      op: 'add';
      day: number;
      mealIndex: number;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      foodId: string;
      portionGrams: number;
    }
  | {
      op: 'override-macros';
      itemId: string;
      macros: { kcal: number; proteinG: number; fatG: number; carbsG: number };
      reason?: string | undefined;
    }
  | { op: 'apply-day-to-week'; day: number }
  | { op: 'set-title'; title: string };

export type PublishPlanBody = {
  reviewed: true;
  acknowledgeDrift?: boolean;
};
