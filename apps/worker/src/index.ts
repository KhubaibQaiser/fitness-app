import { PgBoss } from 'pg-boss';
import { z } from 'zod';
import { createDb } from '@gymos/db';
import { getPilotPrincipal } from '@gymos/modules/identity';
import { cleanupExpired, refreshAttention, rollCheckIns } from './jobs/checkins-roll';

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    QUEUE_DATABASE_URL: z.string().min(1),
    TENANT_TIMEZONE: z.string().default('Asia/Karachi'),
  })
  .parse(process.env);

const { db } = createDb(env.DATABASE_URL, 2);

/**
 * pg-boss on the VM-local ephemeral queue-db (never on Neon: a polling
 * worker would keep the free-tier compute awake 24/7 — ADR-0008/0015).
 */
const boss = new PgBoss({ connectionString: env.QUEUE_DATABASE_URL });
boss.on('error', (error: Error) => console.error('pg-boss error', error));

const QUEUES = {
  checkinsRoll: 'maintenance.checkins-roll',
  attention: 'maintenance.attention-refresh',
  cleanup: 'maintenance.cleanup',
} as const;

await boss.start();
for (const queue of Object.values(QUEUES)) {
  await boss.createQueue(queue);
}

// Schedules (UTC cron): nightly rolls at 21:05 UTC ≈ 02:05 Asia/Karachi.
await boss.schedule(QUEUES.checkinsRoll, '5 21 * * *');
await boss.schedule(QUEUES.attention, '15 21 * * *');
await boss.schedule(QUEUES.cleanup, '30 22 * * *');

await boss.work(QUEUES.checkinsRoll, async () => {
  const principal = await getPilotPrincipal(db);
  await rollCheckIns(db, principal.userId, env.TENANT_TIMEZONE);
  console.log('checkins-roll: done');
});

await boss.work(QUEUES.attention, async () => {
  await refreshAttention(db, env.TENANT_TIMEZONE);
  console.log('attention-refresh: done');
});

await boss.work(QUEUES.cleanup, async () => {
  await cleanupExpired(db);
  console.log('cleanup: done');
});

console.log('gymos worker running — queues:', Object.values(QUEUES).join(', '));

const shutdown = async (): Promise<void> => {
  console.log('worker shutting down…');
  await boss.stop({ timeout: 10_000 });
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
