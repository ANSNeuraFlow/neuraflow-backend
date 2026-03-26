import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';
import { addUpdatedAtTrigger, removeUpdatedAtTrigger } from '../utils';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('eeg_sessions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('device_name', 'varchar(128)', (col) => col.notNull())
    .addColumn('protocol_name', 'varchar(128)', (col) => col.notNull())
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('INITIALIZED'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('started_at', 'timestamptz')
    .addColumn('ended_at', 'timestamptz')
    .execute();

  await addUpdatedAtTrigger(db, 'eeg_sessions');
}

export async function down(db: Kysely<DB>): Promise<void> {
  await removeUpdatedAtTrigger(db, 'eeg_sessions');
  await db.schema.dropTable('eeg_sessions').execute();
}
