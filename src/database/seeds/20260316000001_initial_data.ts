import bcrypt from 'bcrypt';
import { type Kysely } from 'kysely';

import type { DB } from '../schema/db';

export async function seed(db: Kysely<DB>): Promise<void> {
  // 1. Seed Roles
  await db
    .insertInto('roles')
    .values([{ name: 'ADMIN' }, { name: 'USER' }])
    .onConflict((oc) => oc.column('name').doNothing())
    .execute();

  const adminRole = await db.selectFrom('roles').select('id').where('name', '=', 'ADMIN').executeTakeFirstOrThrow();

  // 2. Seed Permissions
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

  // 3. Link Admin Role to all Permissions
  const allPermissions = await db.selectFrom('permissions').select('id').execute();

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

  // 4. Seed Default Admin User
  const adminEmail = 'admin@neuraflow.com';
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await db
    .insertInto('users')
    .values({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      isVerified: true,
      roleId: adminRole.id,
    })
    .onConflict((oc) => oc.column('email').doNothing())
    .execute();
}
