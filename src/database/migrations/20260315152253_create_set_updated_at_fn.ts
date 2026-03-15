import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.executeQuery(
    sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.compile(db),
  );
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.executeQuery(
    sql`
    DROP FUNCTION IF EXISTS set_updated_at();
  `.compile(db),
  );
}
