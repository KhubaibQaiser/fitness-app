import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { ok, type ClientIntake, type Result, type SignedClientIntake } from '@gymos/core';
import { type ScopeSet } from '@gymos/core/rbac';
import { nowIso, schema as s, type Db } from '@gymos/db';
import { writeDietaryProfileTx, type RestrictionInput } from '../nutrition/dietary';
import { writeAudit } from '../shared/audit';
import { createGoalTx, type CreateGoalInput, type GoalError } from './goals';
import { recordVitals, type RecordVitalsInput } from './vitals';

export type { ClientIntake, SignedClientIntake };

export type ClientListItem = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  attentionScore: number;
  attentionReasons: { code: string; weight: number; since: string }[];
  latestWeightKg: number | null;
  goalPreset: string | null;
};

export type MedicalFlags = {
  pregnant?: boolean | undefined;
  conditions?: string[] | undefined;
  physicianClearanceRequired?: boolean | undefined;
};

export type ListClientsOpts = {
  q?: string;
  status?: 'active' | 'archived';
  limit?: number;
  /** Tenant scope from the authenticated principal — required for isolation. */
  scope: ScopeSet;
  orgId: string;
};

export const listClients = async (db: Db, opts: ListClientsOpts): Promise<ClientListItem[]> => {
  const conditions = [
    opts.status ? eq(s.clients.status, opts.status) : eq(s.clients.status, 'active'),
    ...(opts.q ? [ilike(s.clients.name, `%${opts.q}%`)] : []),
  ];

  if (opts.scope.orgWide) {
    conditions.push(eq(s.outlets.orgId, opts.orgId));
  } else if (opts.scope.outletIds.length > 0) {
    conditions.push(inArray(s.clients.outletId, [...opts.scope.outletIds]));
  } else if (opts.scope.assignedClientIds.length > 0) {
    conditions.push(inArray(s.clients.id, [...opts.scope.assignedClientIds]));
  } else {
    conditions.push(sql`false`);
  }

  const rows = await db
    .select({
      id: s.clients.id,
      name: s.clients.name,
      status: s.clients.status,
      attentionScore: sql<number>`coalesce(${s.clientAttention.score}, 0)::int`,
      attentionReasons: s.clientAttention.reasons,
      latestWeightKg: sql<number | null>`(
        select v.weight_kg::float from vitals v
        where v.client_id = ${s.clients.id} and v.weight_kg is not null
        order by v.recorded_at desc limit 1
      )`,
      goalPreset: sql<string | null>`(
        select g.preset::text from client_goals g
        where g.client_id = ${s.clients.id} and g.status = 'ACTIVE' limit 1
      )`,
    })
    .from(s.clients)
    .innerJoin(s.outlets, eq(s.outlets.id, s.clients.outletId))
    .leftJoin(s.clientAttention, eq(s.clientAttention.clientId, s.clients.id))
    .where(and(...conditions))
    .orderBy(desc(sql`coalesce(${s.clientAttention.score}, 0)`), s.clients.name)
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r, attentionReasons: r.attentionReasons ?? [] }));
};

export type CreateClientInput = {
  name: string;
  sex: 'F' | 'M';
  dob?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  heightCm?: number | undefined;
  activityLevel?: number | undefined;
  medicalFlags?: MedicalFlags | undefined;
  intake?: ClientIntake | undefined;
};

export const createClient = async (
  db: Db,
  principal: { userId: string; coachId: string; outletId: string },
  input: CreateClientInput,
) => {
  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(s.clients)
      .values({
        outletId: principal.outletId,
        name: input.name,
        sex: input.sex,
        dob: input.dob ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        heightCm: input.heightCm ?? null,
        activityLevel: input.activityLevel ?? null,
        medicalFlags: input.medicalFlags ?? null,
        intake: input.intake ?? null,
      })
      .returning();
    if (!client) throw new Error('client insert failed');
    await tx.insert(s.coachAssignments).values({
      coachId: principal.coachId,
      clientId: client.id,
      outletId: principal.outletId,
      assignedBy: principal.userId,
    });
    await tx.insert(s.clientAttention).values({
      clientId: client.id,
      score: 50,
      reasons: [{ code: 'NEW_CLIENT', weight: 50, since: nowIso() }],
      computedAt: nowIso(),
    });
    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'client.create',
      resourceType: 'client',
      resourceId: client.id,
      after: { name: client.name },
    });
    return client;
  });
};

export type OnboardVitalsInput = Pick<
  RecordVitalsInput,
  'weightKg' | 'chestCm' | 'waistCm' | 'hipCm' | 'armCm' | 'thighCm' | 'bodyFatPct'
> & { weightKg: number };

export type OnboardClientInput = {
  client: CreateClientInput & {
    heightCm: number;
    activityLevel: number;
    intake: SignedClientIntake;
  };
  vitals: OnboardVitalsInput;
  goal: CreateGoalInput;
  dietary?: RestrictionInput[];
};

export type OnboardClientResult = {
  client: typeof s.clients.$inferSelect;
  vitals: typeof s.vitals.$inferSelect;
  goal: typeof s.clientGoals.$inferSelect;
};

export type OnboardError = GoalError;

class OnboardAbortError extends Error {
  constructor(readonly result: Result<never, OnboardError>) {
    super('onboard_aborted');
    this.name = 'OnboardAbortError';
  }
}

/** Atomic onboarding: client + assignment + initial vitals + goal. */
export const onboardClient = async (
  db: Db,
  principal: { userId: string; coachId: string; outletId: string },
  input: OnboardClientInput,
): Promise<Result<OnboardClientResult, OnboardError>> => {
  try {
    return await db.transaction(async (tx) => {
      const intake: ClientIntake = {
        signaturePngBase64: input.client.intake.signaturePngBase64,
        signedAt: input.client.intake.signedAt,
        ...(input.client.intake.heightDisplayUnit !== undefined
          ? { heightDisplayUnit: input.client.intake.heightDisplayUnit }
          : {}),
      };

      const [client] = await tx
        .insert(s.clients)
        .values({
          outletId: principal.outletId,
          name: input.client.name,
          sex: input.client.sex,
          dob: input.client.dob ?? null,
          phone: input.client.phone ?? null,
          email: input.client.email ?? null,
          heightCm: input.client.heightCm,
          activityLevel: input.client.activityLevel,
          medicalFlags: input.client.medicalFlags ?? null,
          intake,
        })
        .returning();
      if (!client) throw new Error('client insert failed');

      await tx.insert(s.coachAssignments).values({
        coachId: principal.coachId,
        clientId: client.id,
        outletId: principal.outletId,
        assignedBy: principal.userId,
      });
      await tx.insert(s.clientAttention).values({
        clientId: client.id,
        score: 50,
        reasons: [{ code: 'NEW_CLIENT', weight: 50, since: nowIso() }],
        computedAt: nowIso(),
      });
      await writeAudit(tx, {
        actorUserId: principal.userId,
        actorRole: 'COACH',
        action: 'client.onboard',
        resourceType: 'client',
        resourceId: client.id,
        after: { name: client.name },
      });

      const vitals = await recordVitals(tx, principal, client.id, {
        weightKg: input.vitals.weightKg,
        ...(input.vitals.chestCm !== undefined ? { chestCm: input.vitals.chestCm } : {}),
        ...(input.vitals.waistCm !== undefined ? { waistCm: input.vitals.waistCm } : {}),
        ...(input.vitals.hipCm !== undefined ? { hipCm: input.vitals.hipCm } : {}),
        ...(input.vitals.armCm !== undefined ? { armCm: input.vitals.armCm } : {}),
        ...(input.vitals.thighCm !== undefined ? { thighCm: input.vitals.thighCm } : {}),
        ...(input.vitals.bodyFatPct !== undefined ? { bodyFatPct: input.vitals.bodyFatPct } : {}),
      });

      const goalResult = await createGoalTx(tx, principal, client, input.goal);
      if (!goalResult.ok) {
        throw new OnboardAbortError(goalResult);
      }

      await writeDietaryProfileTx(tx, principal, client.id, input.dietary ?? []);

      return ok({ client, vitals, goal: goalResult.value });
    });
  } catch (caught) {
    if (caught instanceof OnboardAbortError) {
      return caught.result;
    }
    throw caught;
  }
};

export const getClient = async (db: Db, clientId: string) => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  return client ?? null;
};

export type UpdateClientInput = {
  name?: string | undefined;
  sex?: 'F' | 'M' | undefined;
  dob?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  heightCm?: number | undefined;
  activityLevel?: number | undefined;
  medicalFlags?: MedicalFlags | undefined;
  intake?: ClientIntake | undefined;
  status?: 'active' | 'archived' | undefined;
};

export const updateClient = async (
  db: Db,
  principal: { userId: string },
  clientId: string,
  input: UpdateClientInput,
) => {
  const [updated] = await db
    .update(s.clients)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.dob !== undefined ? { dob: input.dob } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
      ...(input.activityLevel !== undefined ? { activityLevel: input.activityLevel } : {}),
      ...(input.medicalFlags !== undefined ? { medicalFlags: input.medicalFlags } : {}),
      ...(input.intake !== undefined ? { intake: input.intake } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(eq(s.clients.id, clientId))
    .returning();
  if (updated) {
    await writeAudit(db, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'client.update',
      resourceType: 'client',
      resourceId: clientId,
      after: input,
    });
  }
  return updated ?? null;
};
