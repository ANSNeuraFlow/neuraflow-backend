import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import type { LoginDto } from 'modules/auth/dtos/login.dto';
import type { RegisterDto } from 'modules/auth/dtos/register.dto';

import { JweService } from './jwe.service';

const TOKEN_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>,
    private readonly jweService: JweService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, firstName, lastName } = dto;

    const existing = await this.db.selectFrom('users').select(['id']).where('email', '=', email).executeTakeFirst();

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.db
      .insertInto('users')
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isVerified: false,
      })
      .returning(['id', 'email', 'isVerified'])
      .executeTakeFirstOrThrow();

    return { id: user.id, email: user.email, isVerified: user.isVerified };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.db
      .selectFrom('users')
      .leftJoin('roles', 'users.roleId', 'roles.id')
      .select(['users.id', 'users.email', 'users.password', 'users.isVerified', 'roles.name as role'])
      .where('users.email', '=', email)
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.db.updateTable('users').set({ lastLogin: new Date() }).where('id', '=', user.id).execute();

    const token = await this.jweService.issueToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      maxAgeMs: TOKEN_HOURS * 60 * 60 * 1000,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.db
      .selectFrom('users as u')
      .leftJoin('roles as r', 'u.roleId', 'r.id')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.createdAt', 'r.name as role', 'r.id as roleId'])
      .where('u.id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.db
      .selectFrom('permissions')
      .innerJoin('rolePermissions', 'permissions.id', 'rolePermissions.permissionId')
      .where('rolePermissions.roleId', '=', user.roleId)
      .select(['permissions.name'])
      .execute();

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      permissions: permissions.map((p) => p.name),
    };
  }
}
