import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { nowIso, schema as s, type Db } from '@gymos/db';
import { writeAudit } from '../shared/audit';

export type ClientListItem = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  attentionScore: number;
  attentionReasons: { code: string; weight: number; since: string }[];
  latestWeightKg: number | null;
  goalPreset: string | null;
};

export const listClients = async (
  db: Db,
  opts: { q?: string; status?: 'active' | 'archived'; limit?: number },
): Promise<ClientListItem[]> => {
  const conditions = [
    opts.status ? eq(s.clients.status, opts.status) : eq(s.clients.status, 'active'),
    ...(opts.q ? [ilike(s.clients.name, `%${opts.q}%`)] : []),
  ];
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
  heightCm?: number | undefined;
  activityLevel?: number | undefined;
  medicalFlags?: { pregnant?: boolean | undefined; conditions?: string[] | undefined } | undefined;
  intake?: Record<string, string> | undefined;
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

export const getClient = async (db: Db, clientId: string) => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  return client ?? null;
};

export type UpdateClientInput = {
  name?: string | undefined;
  sex?: 'F' | 'M' | undefined;
  dob?: string | undefined;
  phone?: string | undefined;
  heightCm?: number | undefined;
  activityLevel?: number | undefined;
  medicalFlags?: { pregnant?: boolean | undefined; conditions?: string[] | undefined } | undefined;
  intake?: Record<string, string> | undefined;
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
      ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
      ...(input.activityLevel !== undefined ? { activityLevel: input.activityLevel } : {}),
      ...(input.medicalFlags !== undefined ? { medicalFlags: input.medicalFlags } : {}),
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
