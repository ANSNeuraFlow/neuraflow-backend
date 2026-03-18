import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';
import { addUpdatedAtTrigger, removeUpdatedAtTrigger } from '../utils';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('first_name', 'varchar(128)', (col) => col.notNull())
    .addColumn('last_name', 'varchar(128)', (col) => col.notNull())
    .addColumn('is_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('role_id', 'bigint', (col) => col.references('roles.id').onDelete('set null'))
    .addColumn('last_login', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await addUpdatedAtTrigger(db, 'users');
}

export async function down(db: Kysely<DB>): Promise<void> {
  await removeUpdatedAtTrigger(db, 'users');
  await db.schema.dropTable('users').execute();
}
