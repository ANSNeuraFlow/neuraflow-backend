import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';
import { addUpdatedAtTrigger, removeUpdatedAtTrigger } from '../utils';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('ml_models')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('training_job_id', 'uuid', (col) => col.notNull().references('training_jobs.id').onDelete('cascade'))
    .addColumn('session_id', 'uuid', (col) => col.notNull().references('eeg_sessions.id').onDelete('cascade'))
    .addColumn('name', 'varchar(128)', (col) => col.notNull())
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('accuracy', 'float8')
    .addColumn('file_path', 'varchar(512)')
    .addColumn('file_size', 'bigint')
    .addColumn('trained_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await addUpdatedAtTrigger(db, 'ml_models');
}

export async function down(db: Kysely<DB>): Promise<void> {
  await removeUpdatedAtTrigger(db, 'ml_models');
  await db.schema.dropTable('ml_models').execute();
}
