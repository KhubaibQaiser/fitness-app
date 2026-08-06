import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { nowIso } from '../time';

/** UUIDv7 primary key, generated app-side (PG17 has no native uuidv7). */
export const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** timestamptz stored/read as ISO strings — Luxon handles all date math. */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => nowIso());

export const deletedAt = () => timestamp('deleted_at', { withTimezone: true, mode: 'string' });

export const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });
