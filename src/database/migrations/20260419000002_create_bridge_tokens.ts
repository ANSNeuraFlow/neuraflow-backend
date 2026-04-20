import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('bridge_tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('device_id', 'varchar(128)')
    .addColumn('token_hash', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('scope', 'varchar(64)', (col) => col.notNull().defaultTo('bridge:stream'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_bridge_tokens_user_id').on('bridge_tokens').column('user_id').execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('bridge_tokens').execute();
}
