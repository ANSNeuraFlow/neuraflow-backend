import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

const TABLE_NAME = 'seed_history';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable(TABLE_NAME)
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('env', 'varchar', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable(TABLE_NAME).execute();
}
