import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import type { CreateAdminUserDto } from '../dtos/create-admin-user.dto';

@Injectable()
export class AdminRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async checkUserExistsByEmail(email: string) {
    return this.db.selectFrom('users').select(['id']).where('email', '=', email).executeTakeFirst();
  }

  async createUser(dto: CreateAdminUserDto, hashedPassword: string, roleId: number | null) {
    return this.db
      .insertInto('users')
      .values({
        id: uuidv7(),
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: true,
        isPasswordChangeRequired: true,
        roleId,
      })
      .returning(['id', 'email', 'firstName', 'lastName', 'isVerified', 'isPasswordChangeRequired', 'roleId'])
      .executeTakeFirstOrThrow();
  }

  async getAllUsers() {
    return this.db
      .selectFrom('users as u')
      .leftJoin('roles as r', 'u.roleId', 'r.id')
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.isVerified',
        'u.isPasswordChangeRequired',
        'u.lastLogin',
        'u.createdAt',
        'r.id as roleId',
        'r.name as role',
      ])
      .orderBy('u.createdAt', 'desc')
      .execute();
  }

  async getUserById(userId: string) {
    return this.db
      .selectFrom('users as u')
      .leftJoin('roles as r', 'u.roleId', 'r.id')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'r.id as roleId', 'r.name as role'])
      .where('u.id', '=', userId)
      .executeTakeFirst();
  }

  async updateUserRole(userId: string, roleId: number) {
    return this.db
      .updateTable('users')
      .set({ roleId })
      .where('id', '=', userId)
      .returning(['id', 'email', 'roleId'])
      .executeTakeFirst();
  }

  async deleteUser(userId: string) {
    return this.db.deleteFrom('users').where('id', '=', userId).returning(['id']).executeTakeFirst();
  }
  async getRoleByName(name: string) {
    return this.db.selectFrom('roles').select(['id', 'name']).where('name', '=', name).executeTakeFirst();
  }
}
