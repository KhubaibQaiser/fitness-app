import { isNull } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { clientStatusEnum, coachTierEnum, roleEnum, sexEnum } from './enums';
import { createdAt, deletedAt, id, tstz, updatedAt } from './helpers';

export const organizations = pgTable('organizations', {
  id: id(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const outlets = pgTable('outlets', {
  id: id(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  /** IANA timezone — every outlet carries its own; there is no app timezone. */
  timezone: text('timezone').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const users = pgTable('users', {
  id: id(),
  email: text('email').unique(),
  phone: text('phone'),
  name: text('name').notNull(),
  locale: text('locale').notNull().default('en'),
  /** NULL falls back to the tenant default from the manifest. */
  unitPref: text('unit_pref', { enum: ['metric', 'imperial'] }),
  avatarKey: text('avatar_key'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

/** Role assignments — the authorization source of truth (never a users.role column). */
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: roleEnum('role').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    /** NULL = org-wide scope. */
    outletId: uuid('outlet_id').references(() => outlets.id),
    createdBy: uuid('created_by').references(() => users.id),
    revokedAt: tstz('revoked_at'),
    createdAt: createdAt(),
  },
  (t) => [index('memberships_user_idx').on(t.userId)],
);

export const clients = pgTable(
  'clients',
  {
    id: id(),
    /** Members get login accounts in P2; pilot clients have no user. */
    userId: uuid('user_id').references(() => users.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    name: text('name').notNull(),
    sex: sexEnum('sex').notNull(),
    dob: text('dob'), // ISO date; nullable — age gates use it when present
    phone: text('phone'),
    email: text('email'),
    heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }),
    activityLevel: numeric('activity_level', { precision: 4, scale: 3, mode: 'number' }),
    /** Drives safety gates + onboarding medical answers. */
    medicalFlags: jsonb('medical_flags').$type<{
      pregnant?: boolean | undefined;
      conditions?: string[] | undefined;
      physicianClearanceRequired?: boolean | undefined;
    }>(),
    status: clientStatusEnum('status').notNull().default('active'),
    /**
     * Intake meta (e-sign, display prefs). Keys are strings by design.
     * Known: signaturePngBase64, signedAt, heightDisplayUnit.
     */
    intake: jsonb('intake').$type<Record<string, string>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('clients_outlet_idx').on(t.outletId), index('clients_status_idx').on(t.status)],
);

export const coaches = pgTable('coaches', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  tier: coachTierEnum('tier').notNull().default('senior'),
  caseloadLimit: integer('caseload_limit'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const coachAssignments = pgTable(
  'coach_assignments',
  {
    id: id(),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    assignedBy: uuid('assigned_by').references(() => users.id),
    assignedAt: tstz('assigned_at').notNull().defaultNow(),
    unassignedAt: tstz('unassigned_at'),
  },
  (t) => [
    index('coach_assignments_coach_idx').on(t.coachId),
    uniqueIndex('coach_assignments_active_client_uq').on(t.clientId).where(isNull(t.unassignedAt)),
  ],
);

export const coachNotes = pgTable(
  'coach_notes',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    coachId: uuid('coach_id')
      .notNull()
      .references(() => coaches.id),
    body: text('body').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('coach_notes_client_idx').on(t.clientId)],
);

export const isMetricPref = (pref: string | null): boolean => pref !== 'imperial';

export type MedicalFlags = {
  pregnant?: boolean | undefined;
  conditions?: string[] | undefined;
};
export const hasMedicalFlags = (flags: MedicalFlags | null): boolean =>
  flags !== null && (flags.pregnant === true || (flags.conditions?.length ?? 0) > 0);
