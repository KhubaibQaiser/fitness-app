import { schema as s, type DbOrTx } from '@gymos/db';

export type AuditEntry = {
  actorUserId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export const writeAudit = async (db: DbOrTx, entry: AuditEntry): Promise<void> => {
  await db.insert(s.auditLog).values({
    actorUserId: entry.actorUserId,
    actorRole: entry.actorRole,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
};
