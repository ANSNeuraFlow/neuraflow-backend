import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import type { UserUpdate } from 'database/schema/user';
import { Kysely } from 'kysely';

import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UsersRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async getProfileById(userId: string) {
    return this.db
      .selectFrom('users as u')
      .leftJoin('roles as r', 'u.roleId', 'r.id')
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.bio',
        'u.phoneNumber',
        'u.dateOfBirth',
        'u.isVerified',
        'u.lastLogin',
        'u.createdAt',
        'r.id as roleId',
        'r.name as roleName',
      ])
      .where('u.id', '=', userId)
      .executeTakeFirst();
  }

  async getPermissionsByRoleId(roleId: number): Promise<string[]> {
    const rows = await this.db
      .selectFrom('permissions')
      .innerJoin('rolePermissions', 'permissions.id', 'rolePermissions.permissionId')
      .where('rolePermissions.roleId', '=', roleId as any)
      .select(['permissions.name'])
      .execute();
    return rows.map((p) => p.name);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const patch: UserUpdate = { updatedAt: new Date() };
    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.bio !== undefined) patch.bio = dto.bio;
    if (dto.phoneNumber !== undefined) patch.phoneNumber = dto.phoneNumber;
    if (dto.dateOfBirth !== undefined) patch.dateOfBirth = dto.dateOfBirth;

    const row = await this.db
      .updateTable('users')
      .set(patch)
      .where('id', '=', userId)
      .returning('id')
      .executeTakeFirst();

    return row?.id;
  }

  async getUserStats(userId: string) {
    const [eegSessions, trainingJobs, modelDeployments, mlModels] = await Promise.all([
      this.countByUserId('eegSessions', userId),
      this.countByUserId('trainingJobs', userId),
      this.countByUserId('modelDeployments', userId),
      this.countByUserId('mlModels', userId),
    ]);

    return {
      eegSessionCount: eegSessions,
      trainingJobCount: trainingJobs,
      modelDeploymentCount: modelDeployments,
      mlModelCount: mlModels,
    };
  }

  private async countByUserId(
    table: 'eegSessions' | 'trainingJobs' | 'modelDeployments' | 'mlModels',
    userId: string,
  ): Promise<number> {
    const row = await this.db
      .selectFrom(table)
      .select((eb) => [eb.fn.countAll<number>().as('count')])
      .where('userId', '=', userId)
      .executeTakeFirst();
    return Number(row?.['count'] ?? 0);
  }
}
