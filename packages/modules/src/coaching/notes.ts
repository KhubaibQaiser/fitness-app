import { desc, eq } from 'drizzle-orm';
import { schema as s, type Db } from '@gymos/db';

export const listNotes = async (db: Db, clientId: string, limit = 100) =>
  db
    .select()
    .from(s.coachNotes)
    .where(eq(s.coachNotes.clientId, clientId))
    .orderBy(desc(s.coachNotes.createdAt))
    .limit(limit);

export const createNote = async (
  db: Db,
  principal: { coachId: string },
  clientId: string,
  body: string,
) => {
  const [note] = await db
    .insert(s.coachNotes)
    .values({ clientId, coachId: principal.coachId, body })
    .returning();
  if (!note) throw new Error('note insert failed');
  return note;
};
