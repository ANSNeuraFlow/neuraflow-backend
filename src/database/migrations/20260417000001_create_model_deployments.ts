import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';
import { addUpdatedAtTrigger, removeUpdatedAtTrigger } from '../utils';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('model_deployments')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('ml_model_id', 'uuid', (col) => col.notNull().references('ml_models.id').onDelete('cascade'))
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('ray_app_name', 'varchar(128)')
    .addColumn('serve_endpoint_url', 'varchar(512)')
    .addColumn('error_message', 'text')
    .addColumn('started_at', 'timestamptz')
    .addColumn('stopped_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await addUpdatedAtTrigger(db, 'model_deployments');
}

export async function down(db: Kysely<DB>): Promise<void> {
  await removeUpdatedAtTrigger(db, 'model_deployments');
  await db.schema.dropTable('model_deployments').execute();
}
