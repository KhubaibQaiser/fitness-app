import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  checkInStatusEnum,
  goalPresetEnum,
  goalRateEnum,
  goalStatusEnum,
  photoPoseEnum,
  vitalsSourceEnum,
} from './enums';
import { createdAt, deletedAt, id, tstz } from './helpers';
import { clients, outlets, users } from './tenancy';

/**
 * Append-only vitals time series — rows are NEVER updated or deleted.
 * Monthly partitioning is deferred to P0 (single-tenant pilot volume
 * doesn't justify partition DDL yet; expand/contract migration planned).
 */
export const vitals = pgTable(
  'vitals',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    recordedAt: tstz('recorded_at').notNull(),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    source: vitalsSourceEnum('source').notNull().default('coach'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2, mode: 'number' }),
    bodyFatPct: numeric('body_fat_pct', { precision: 4, scale: 1, mode: 'number' }),
    muscleMassKg: numeric('muscle_mass_kg', { precision: 5, scale: 2, mode: 'number' }),
    chestCm: numeric('chest_cm', { precision: 5, scale: 1, mode: 'number' }),
    waistCm: numeric('waist_cm', { precision: 5, scale: 1, mode: 'number' }),
    hipCm: numeric('hip_cm', { precision: 5, scale: 1, mode: 'number' }),
    armCm: numeric('arm_cm', { precision: 5, scale: 1, mode: 'number' }),
    armLeftCm: numeric('arm_left_cm', { precision: 5, scale: 1, mode: 'number' }),
    armRightCm: numeric('arm_right_cm', { precision: 5, scale: 1, mode: 'number' }),
    thighCm: numeric('thigh_cm', { precision: 5, scale: 1, mode: 'number' }),
    thighLeftCm: numeric('thigh_left_cm', { precision: 5, scale: 1, mode: 'number' }),
    thighRightCm: numeric('thigh_right_cm', { precision: 5, scale: 1, mode: 'number' }),
    restingHr: smallint('resting_hr'),
    bpSystolic: smallint('bp_systolic'),
    bpDiastolic: smallint('bp_diastolic'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('vitals_client_time_idx').on(t.clientId, t.recordedAt.desc())],
);

export const progressPhotos = pgTable(
  'progress_photos',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    takenAt: tstz('taken_at').notNull(),
    pose: photoPoseEnum('pose').notNull().default('front'),
    storageKey: text('storage_key').notNull(),
    /** Consent must be recorded before a photo becomes visible. */
    consentRecordedAt: tstz('consent_recorded_at').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('progress_photos_client_idx').on(t.clientId, t.takenAt.desc())],
);

export const clientGoals = pgTable(
  'client_goals',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    preset: goalPresetEnum('preset').notNull(),
    rate: goalRateEnum('rate').notNull(),
    startDate: text('start_date').notNull(), // ISO date
    startWeightKg: numeric('start_weight_kg', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    targetWeightKg: numeric('target_weight_kg', { precision: 5, scale: 2, mode: 'number' }),
    targetDate: text('target_date'), // ISO date
    /** Derived at creation from Layer 1 — stored for audit reproducibility. */
    expectedWeeklyDeltaKg: numeric('expected_weekly_delta_kg', {
      precision: 4,
      scale: 2,
      mode: 'number',
    }).notNull(),
    /** Targets snapshot from Layer 1 at goal creation: {kcal, proteinG, fatG, carbsG, fiberG}. */
    initialTargets: jsonb('initial_targets').$type<{
      kcal: number;
      proteinG: number;
      fatG: number;
      carbsG: number;
      fiberG: number;
    }>(),
    tdeeEstimate: integer('tdee_estimate'),
    /** Coach-resolved daily kcal. Null on rows created before ADR-0014. */
    targetKcal: integer('target_kcal'),
    /** 0 = Sunday … 6 = Saturday, in the outlet's timezone. */
    checkinWeekday: smallint('checkin_weekday').notNull().default(1),
    status: goalStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: createdAt(),
  },
  (t) => [
    index('client_goals_client_idx').on(t.clientId),
    index('client_goals_outlet_idx').on(t.outletId),
    uniqueIndex('client_goals_one_active_uq')
      .on(t.clientId)
      .where(sql`${t.status} = 'ACTIVE'`),
  ],
);

export const checkIns = pgTable(
  'check_ins',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => clientGoals.id),
    scheduledFor: text('scheduled_for').notNull(), // ISO date in outlet tz
    completedAt: tstz('completed_at'),
    vitalsId: uuid('vitals_id').references(() => vitals.id),
    adherenceRating: smallint('adherence_rating'), // 1–5
    coachNotes: text('coach_notes'),
    /** Full AdjustmentRecommendation snapshot from the adaptive engine. */
    engineOutput: jsonb('engine_output').$type<Record<string, unknown>>(),
    status: checkInStatusEnum('status').notNull().default('DUE'),
    createdAt: createdAt(),
  },
  (t) => [
    index('check_ins_client_idx').on(t.clientId, t.scheduledFor.desc()),
    index('check_ins_status_idx').on(t.status, t.scheduledFor),
    index('check_ins_outlet_idx').on(t.outletId),
    uniqueIndex('check_ins_one_due_per_goal_uq')
      .on(t.goalId)
      .where(sql`${t.status} = 'DUE'`),
  ],
);
