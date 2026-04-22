import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text`.execute(db);
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number varchar(32)`.execute(db);
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date`.execute(db);
}

export async function down(db: Kysely<DB>): Promise<void> {
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth`.execute(db);
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS phone_number`.execute(db);
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS bio`.execute(db);
}
