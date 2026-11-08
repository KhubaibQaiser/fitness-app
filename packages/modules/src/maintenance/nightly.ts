import { type Db } from '@gymos/db';
import { resolvePilotCoachPrincipal } from '../identity';
import { refreshFoodRankings } from '../nutrition';
import { cleanupExpired, refreshAttention, rollCheckIns } from './checkins-roll';

export type JobResult = { job: string; ok: boolean; error?: string };

/**
 * The four nightly maintenance jobs, in order. A failing job is recorded and
 * the rest still run, so one bad job cannot starve the others. Every job is
 * idempotent: a retry or a late/duplicate trigger changes nothing further.
 */
export const runNightly = async (db: Db, zone: string): Promise<JobResult[]> => {
  const jobs: [string, () => Promise<unknown>][] = [
    [
      'checkins-roll',
      async () => {
        const principal = await resolvePilotCoachPrincipal(db);
        await rollCheckIns(db, principal.userId, zone);
      },
    ],
    ['attention-refresh', () => refreshAttention(db, zone)],
    ['ranking-refresh', () => refreshFoodRankings(db)],
    ['cleanup', () => cleanupExpired(db)],
  ];
  const results: JobResult[] = [];
  for (const [job, run] of jobs) {
    try {
      await run();
      results.push({ job, ok: true });
    } catch (error) {
      results.push({
        job,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
};
