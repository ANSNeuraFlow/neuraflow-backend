import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { Response } from 'express';
import type { LoginDto } from 'modules/auth/dtos/login.dto';
import type { RegisterDto } from 'modules/auth/dtos/register.dto';

import { AuthRepositoryService } from './auth-repository.service';
import { JweService } from './jwe.service';

const TOKEN_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepositoryService: AuthRepositoryService,
    private readonly jweService: JweService,
  ) {}

  async register(dto: RegisterDto) {
    const { password } = dto;

    const existing = await this.authRepositoryService.checkUserExists(dto.email);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.authRepositoryService.createUser(dto, hashedPassword);

    return { id: user.id, email: user.email, isVerified: user.isVerified };
  }

  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;

    const user = await this.authRepositoryService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.authRepositoryService.updateLastLogin(user.id);

    const token = await this.jweService.issueToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const maxAgeMs = TOKEN_HOURS * 60 * 60 * 1000;

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepositoryService.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = user.roleId ? await this.authRepositoryService.getUserPermissionsByRoleId(user.roleId) : [];

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      permissions,
    };
  }
}
