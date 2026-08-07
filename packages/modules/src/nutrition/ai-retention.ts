import { and, isNotNull, lt } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { iso, schema as s, type Db } from '@gymos/db';

export type AiPurgeResult = {
  readonly retentionDays: number;
  readonly cacheDeleted: number;
  readonly rawLlmCleared: number;
};

/**
 * Retention: drop llm_cache rows and null raw_llm_output older than retentionDays
 * (ADR-0001 default 90 days).
 */
export const purgeStaleAiArtifacts = async (db: Db, retentionDays = 90): Promise<AiPurgeResult> => {
  const cutoff = iso(DateTime.utc().minus({ days: retentionDays }));

  const deletedCache = await db
    .delete(s.llmCache)
    .where(lt(s.llmCache.createdAt, cutoff))
    .returning({ inputHash: s.llmCache.inputHash });

  const cleared = await db
    .update(s.planGenerations)
    .set({ rawLlmOutput: null })
    .where(and(lt(s.planGenerations.createdAt, cutoff), isNotNull(s.planGenerations.rawLlmOutput)))
    .returning({ id: s.planGenerations.id });

  return {
    retentionDays,
    cacheDeleted: deletedCache.length,
    rawLlmCleared: cleared.length,
  };
};
