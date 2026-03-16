import { type Kysely } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('permissions')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(128)', (col) => col.notNull().unique())
    .execute();

  await db.schema
    .createTable('role_permissions')
    .addColumn('role_id', 'bigint', (col) => col.notNull().references('roles.id').onDelete('cascade'))
    .addColumn('permission_id', 'bigint', (col) => col.notNull().references('permissions.id').onDelete('cascade'))
    .addPrimaryKeyConstraint('role_permissions_pkey', ['role_id', 'permission_id'])
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('role_permissions').execute();
  await db.schema.dropTable('permissions').execute();
}
