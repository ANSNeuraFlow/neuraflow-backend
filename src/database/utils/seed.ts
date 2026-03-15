import type { Kysely } from 'kysely';

import type { DB } from '../schema/db';

export const alreadyRan = async (db: Kysely<DB>, seedName: string) => {
  const status = await db.selectFrom('seedHistory').select('name').where('name', '=', seedName).executeTakeFirst();

  return status !== undefined;
};

export const markAsRan = async (db: Kysely<DB>, seedName: string, env: string) => {
  await db.insertInto('seedHistory').values({ name: seedName, env }).execute();
};

export interface RunSeedProps {
  db: Kysely<DB>;
  seedName: string;
  dev: (db: Kysely<DB>) => Promise<void>;
  prod: (db: Kysely<DB>) => Promise<void>;
}

export const runSeed = async ({ db, seedName, dev, prod }: RunSeedProps) => {
  if (await alreadyRan(db, seedName)) {
    return;
  }

  const env = process.env.NODE_ENV ?? 'production';

  if (env === 'development') {
    await dev(db);
  } else {
    await prod(db);
  }

  await markAsRan(db, seedName, env);
};
