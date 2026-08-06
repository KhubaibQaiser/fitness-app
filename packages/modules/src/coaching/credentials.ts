import { eq } from 'drizzle-orm';
import { err, ok, type Result } from '@gymos/core';
import { schema as s, type Db } from '@gymos/db';
import { getActiveGoal } from './goals';
import { latestWeightKg, listVitals } from './vitals';

export type CredentialsPdfError = { code: 'CLIENT_NOT_FOUND' } | { code: 'SIGNATURE_MISSING' };

export type CredentialsPdfData = {
  client: typeof s.clients.$inferSelect;
  latestVitals: typeof s.vitals.$inferSelect | null;
  latestWeightKg: number | null;
  goal: typeof s.clientGoals.$inferSelect | null;
};

/** Aggregate fields needed to render the credentials PDF. */
export const getCredentialsPdfData = async (
  db: Db,
  clientId: string,
): Promise<Result<CredentialsPdfData, CredentialsPdfError>> => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  if (!client) return err({ code: 'CLIENT_NOT_FOUND' });

  const signedAt = client.intake?.signedAt;
  const signature = client.intake?.signaturePngBase64;
  if (signedAt === undefined || signedAt === '' || signature === undefined || signature === '') {
    return err({ code: 'SIGNATURE_MISSING' });
  }

  const [vitals, weight, goal] = await Promise.all([
    listVitals(db, clientId, 1),
    latestWeightKg(db, clientId),
    getActiveGoal(db, clientId),
  ]);

  return ok({
    client,
    latestVitals: vitals[0] ?? null,
    latestWeightKg: weight,
    goal,
  });
};

/** Soft check used by the client hub (incomplete onboarding banner). */
export const clientHasSignedIntake = (intake: Record<string, string> | null): boolean =>
  typeof intake?.signedAt === 'string' &&
  intake.signedAt.length > 0 &&
  typeof intake.signaturePngBase64 === 'string' &&
  intake.signaturePngBase64.length > 0;
