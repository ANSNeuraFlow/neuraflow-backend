import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('roles')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // await db.insertInto('roles').values([
  //     { name: 'admin' },
  //     { name: 'user' },
  // ]).execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('roles').execute();
}
