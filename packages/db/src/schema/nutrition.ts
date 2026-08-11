import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  feedbackKindEnum,
  foodSourceEnum,
  generationKindEnum,
  generationStatusEnum,
  mealSlotEnum,
  planStatusEnum,
  restrictionTypeEnum,
} from './enums';
import { createdAt, id, tstz, updatedAt } from './helpers';
import { clients, coaches, outlets, users } from './tenancy';

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

/** Versioned, full-history dietary profiles — needed if there is ever an incident. */
export const clientDietaryProfiles = pgTable(
  'client_dietary_profiles',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    version: integer('version').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('dietary_profiles_client_version_uq').on(t.clientId, t.version),
    uniqueIndex('dietary_profiles_one_active_uq')
      .on(t.clientId)
      .where(sql`${t.isActive} = true`),
    index('dietary_profiles_outlet_idx').on(t.outletId),
  ],
);

export const dietaryRestrictions = pgTable(
  'dietary_restrictions',
  {
    id: id(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => clientDietaryProfiles.id),
    type: restrictionTypeEnum('type').notNull(),
    /** Canonical code from @gymos/core/nutrition restrictions registry. */
    code: text('code').notNull(),
    note: text('note'),
  },
  (t) => [index('dietary_restrictions_profile_idx').on(t.profileId)],
);

export type Per100g = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

export type DietaryFlags = {
  halalStatus: 'HALAL' | 'HARAM' | 'QUESTIONABLE' | 'NA';
  vegetarian?: boolean;
  vegan?: boolean;
  containsPork?: boolean;
  containsAlcohol?: boolean;
  containsBeef?: boolean;
};

export const foods = pgTable(
  'foods',
  {
    id: id(),
    source: foodSourceEnum('source').notNull(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    nameUr: text('name_ur'),
    foodGroup: text('food_group').notNull(),
    cuisineTags: text('cuisine_tags').array().notNull().default([]),
    /** Canonical allergen codes — Layer 2's hard filter operates on this. */
    allergenTags: text('allergen_tags').array().notNull().default([]),
    /**
     * Meal slots this food may appear in (breakfast | lunch | dinner | snack).
     * Empty = never selected by the solver until backfilled.
     */
    allowedSlots: text('allowed_slots').array().notNull().default([]),
    dietaryFlags: jsonb('dietary_flags').$type<DietaryFlags>().notNull(),
    per100g: jsonb('per_100g').$type<Per100g>().notNull(),
    costTier: smallint('cost_tier').notNull().default(1),
    prepTimeMin: smallint('prep_time_min').notNull().default(15),
    verified: boolean('verified').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('foods_group_idx').on(t.foodGroup), index('foods_name_idx').on(t.name)],
);

export const foodServingUnits = pgTable(
  'food_serving_units',
  {
    id: id(),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id),
    /** e.g. roti, cup, tbsp, piece — native units the coach thinks in. */
    name: text('name').notNull(),
    grams: numeric('grams', { precision: 6, scale: 1, mode: 'number' }).notNull(),
  },
  (t) => [index('food_serving_units_food_idx').on(t.foodId)],
);

export type PlanTargets = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

export const mealPlans = pgTable(
  'meal_plans',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    version: integer('version').notNull(),
    /** Coach-facing label; null falls back to "Plan v{version}" in UI. */
    title: text('title'),
    status: planStatusEnum('status').notNull().default('DRAFT'),
    targets: jsonb('targets').$type<PlanTargets>().notNull(),
    generationId: uuid('generation_id'),
    startsOn: text('starts_on'), // ISO date
    publishedAt: tstz('published_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('meal_plans_client_version_uq').on(t.clientId, t.version),
    uniqueIndex('meal_plans_one_published_uq')
      .on(t.clientId)
      .where(sql`${t.status} = 'PUBLISHED'`),
    index('meal_plans_client_idx').on(t.clientId),
  ],
);

export type ItemMacros = { kcal: number; proteinG: number; fatG: number; carbsG: number };

export type MacrosSource = 'food_db' | 'coach_override';

export const mealPlanItems = pgTable(
  'meal_plan_items',
  {
    id: id(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => mealPlans.id),
    day: smallint('day').notNull(), // 1..7
    mealIndex: smallint('meal_index').notNull(),
    mealSlot: mealSlotEnum('meal_slot').notNull(),
    mealName: text('meal_name').notNull(),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id),
    portionGrams: numeric('portion_grams', { precision: 6, scale: 1, mode: 'number' }).notNull(),
    /** From food DB by default; coach_override when explicitly set. */
    macros: jsonb('macros').$type<ItemMacros>().notNull(),
    macrosSource: text('macros_source').$type<MacrosSource>().notNull().default('food_db'),
    prepNotes: text('prep_notes'),
    position: smallint('position').notNull().default(0),
  },
  (t) => [index('meal_plan_items_plan_idx').on(t.planId, t.day, t.mealIndex)],
);

/** Full generation audit trail — every AI interaction is reproducible. */
export const planGenerations = pgTable(
  'plan_generations',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id),
    planId: uuid('plan_id'),
    kind: generationKindEnum('kind').notNull().default('INITIAL'),
    status: generationStatusEnum('status').notNull().default('QUEUED'),
    /** De-identified snapshot — no names, ids only where structural. */
    inputs: jsonb('inputs').$type<Record<string, unknown>>().notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),
    configVersion: integer('config_version').notNull().default(1),
    modelId: text('model_id'),
    adapterVersion: text('adapter_version'),
    rawLlmOutput: jsonb('raw_llm_output').$type<Record<string, unknown>>(),
    validation: jsonb('validation').$type<Record<string, unknown>>(),
    override: jsonb('override').$type<{ byUserId: string; reason: string; at: string }>(),
    latencyMs: integer('latency_ms'),
    createdAt: createdAt(),
  },
  (t) => [
    index('plan_generations_client_idx').on(t.clientId, t.createdAt.desc()),
    index('plan_generations_outlet_idx').on(t.outletId),
  ],
);

/** Layer-3 narrative cache — identical inputs never re-run inference. */
export const llmCache = pgTable('llm_cache', {
  inputHash: bytea('input_hash').primaryKey(),
  output: jsonb('output').$type<Record<string, unknown>>().notNull(),
  modelId: text('model_id').notNull(),
  createdAt: createdAt(),
});

/** Layer-4 signals + gold labels — the learning loop's raw material. */
export const aiFeedbackEvents = pgTable(
  'ai_feedback_events',
  {
    id: id(),
    generationId: uuid('generation_id').references(() => planGenerations.id),
    planId: uuid('plan_id').references(() => mealPlans.id),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id),
    kind: feedbackKindEnum('kind').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('ai_feedback_events_kind_idx').on(t.kind, t.createdAt.desc())],
);

/** Nightly ranking.refresh output — steers Layer-2 candidate ordering. */
export const foodRankings = pgTable(
  'food_rankings',
  {
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id),
    slot: mealSlotEnum('slot').notNull(),
    goal: text('goal').notNull(),
    score: numeric('score', { precision: 6, scale: 4, mode: 'number' }).notNull(),
    samples: integer('samples').notNull().default(0),
    computedAt: tstz('computed_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.foodId, t.slot, t.goal] })],
);
