import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('bridge_auth_codes')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('code', 'varchar(128)', (col) => col.notNull().unique())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('client_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('redirect_uri', 'varchar(512)', (col) => col.notNull())
    .addColumn('used', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_bridge_auth_codes_user_id').on('bridge_auth_codes').column('user_id').execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('bridge_auth_codes').execute();
}
