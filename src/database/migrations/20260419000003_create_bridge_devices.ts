import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('bridge_devices')
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('device_name', 'varchar(128)', (col) => col.notNull())
    .addColumn('platform', 'varchar(32)', (col) => col.notNull())
    .addColumn('version', 'varchar(32)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex('idx_bridge_devices_user_id').on('bridge_devices').column('user_id').execute();

  await db.schema
    .alterTable('bridge_tokens')
    .addForeignKeyConstraint('fk_bridge_tokens_device_id', ['device_id'], 'bridge_devices', ['id'])
    .onDelete('set null')
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.alterTable('bridge_tokens').dropConstraint('fk_bridge_tokens_device_id').execute();

  await db.schema.dropTable('bridge_devices').execute();
}
