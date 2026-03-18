import bcrypt from 'bcrypt';
import type { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import type { DB } from '../schema/db';
import { runSeed } from '../utils';

const SEED_NAME = '20260316000001_initial_data';

export async function seed(db: Kysely<DB>): Promise<void> {
  await runSeed({ db, seedName: SEED_NAME, dev, prod });
}

async function seedRolesAndPermissions(db: Kysely<DB>) {
  await db
    .insertInto('roles')
    .values([{ name: 'ADMIN' }, { name: 'USER' }])
    .onConflict((oc) => oc.column('name').doNothing())
    .execute();

  const adminRole = await db.selectFrom('roles').select('id').where('name', '=', 'ADMIN').executeTakeFirstOrThrow();

  const permissionsList = [
    { name: 'users:read' },
    { name: 'users:write' },
    { name: 'roles:read' },
    { name: 'roles:write' },
  ];

  await db
    .insertInto('permissions')
    .values(permissionsList)
    .onConflict((oc) => oc.column('name').doNothing())
    .execute();

  const allPermissions = await db.selectFrom('permissions').select('id').execute();

  if (allPermissions.length > 0) {
    await db
      .insertInto('rolePermissions')
      .values(
        allPermissions.map((p) => ({
          roleId: adminRole.id,
          permissionId: p.id,
        })),
      )
      .onConflict((oc) => oc.columns(['roleId', 'permissionId']).doNothing())
      .execute();
  }

  return adminRole.id;
}

const dev = async (db: Kysely<DB>): Promise<void> => {
  const adminRoleId = await seedRolesAndPermissions(db);

  const adminEmail = 'admin@neuraflow.com';
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await db
    .insertInto('users')
    .values({
      id: uuidv7(),
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      isVerified: true,
      roleId: adminRoleId,
    })
    .onConflict((oc) => oc.column('email').doNothing())
    .execute();
};

const prod = async (db: Kysely<DB>): Promise<void> => {
  await seedRolesAndPermissions(db);
};
