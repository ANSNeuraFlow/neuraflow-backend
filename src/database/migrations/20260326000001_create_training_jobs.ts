import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';
import { addUpdatedAtTrigger, removeUpdatedAtTrigger } from '../utils';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('training_jobs')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('session_ids', sql`uuid[]`, (col) => col.notNull())
    .addColumn('ray_job_id', 'varchar(256)')
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('error_message', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await addUpdatedAtTrigger(db, 'training_jobs');
}

export async function down(db: Kysely<DB>): Promise<void> {
  await removeUpdatedAtTrigger(db, 'training_jobs');
  await db.schema.dropTable('training_jobs').execute();
}
