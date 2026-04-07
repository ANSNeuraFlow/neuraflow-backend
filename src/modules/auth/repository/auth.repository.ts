import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import type { RegisterDto } from 'modules/auth/dtos/register.dto';
import { v7 as uuidv7 } from 'uuid';

import { UserModel } from '../models/user.model';

@Injectable()
export class AuthRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async getUserByEmail(email: string): Promise<UserModel | null> {
    const result = await this.db
      .selectFrom('users')
      .leftJoin('roles', 'users.roleId', 'roles.id')
      .select([
        'users.id',
        'users.email',
        'users.password',
        'users.firstName',
        'users.lastName',
        'users.isVerified',
        'users.isPasswordChangeRequired',
        'users.roleId',
        'roles.name as role',
      ])
      .where('users.email', '=', email)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return UserModel.fromResult(result);
  }

  async checkUserExists(email: string) {
    return this.db.selectFrom('users').select(['id']).where('email', '=', email).executeTakeFirst();
  }

  async createUser(dto: RegisterDto, hashedPassword: string, roleId: number | null): Promise<UserModel> {
    const result = await this.db
      .insertInto('users')
      .values({
        id: uuidv7(),
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: false,
        isPasswordChangeRequired: false,
        roleId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return UserModel.fromResult(result);
  }

  async updateLastLogin(userId: string) {
    return this.db.updateTable('users').set({ lastLogin: new Date() }).where('id', '=', userId).execute();
  }

  async getUserById(userId: string) {
    return this.db
      .selectFrom('users as u')
      .leftJoin('roles as r', 'u.roleId', 'r.id')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.createdAt', 'r.name as role', 'r.id as roleId'])
      .where('u.id', '=', userId)
      .executeTakeFirst();
  }

  async getUserPermissionsByRoleId(roleId: number) {
    const permissions = await this.db
      .selectFrom('permissions')
      .innerJoin('rolePermissions', 'permissions.id', 'rolePermissions.permissionId')
      .where('rolePermissions.roleId', '=', roleId as any)
      .select(['permissions.name'])
      .execute();

    return permissions.map((p) => p.name);
  }

  async updatePasswordAndRemoveChangeFlag(userId: string, hashedNewPassword: string) {
    return this.db
      .updateTable('users')
      .set({
        password: hashedNewPassword,
        isPasswordChangeRequired: false,
      })
      .where('id', '=', userId)
      .execute();
  }
  async getRoleByName(name: string) {
    return this.db.selectFrom('roles').select(['id', 'name']).where('name', '=', name).executeTakeFirst();
  }
}
