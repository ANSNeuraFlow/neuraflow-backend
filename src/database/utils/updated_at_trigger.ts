import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { DB } from '../schema/db';

export const addUpdatedAtTrigger = async (db: Kysely<DB>, tableName: string) => {
  const triggerName = `trg${tableName}_set_updated_at`;

  return await db.executeQuery(
    sql
      .raw(
        `CREATE TRIGGER ${triggerName}
    BEFORE UPDATE ON ${tableName}
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();`,
      )
      .compile(db),
  );
};

export const removeUpdatedAtTrigger = async (db: Kysely<DB>, tableName: string) => {
  const triggerName = `trg${tableName}_set_updated_at`;

  return await db.executeQuery(sql.raw(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};`).compile(db));
};
