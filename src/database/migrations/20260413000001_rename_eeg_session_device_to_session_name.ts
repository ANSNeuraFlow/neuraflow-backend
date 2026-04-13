import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await sql`ALTER TABLE eeg_sessions RENAME COLUMN device_name TO session_name`.execute(db);
}

export async function down(db: Kysely<DB>): Promise<void> {
  await sql`ALTER TABLE eeg_sessions RENAME COLUMN session_name TO device_name`.execute(db);
}
