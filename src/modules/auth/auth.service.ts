import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { AppConfig } from 'config/configuration';
import type { Response } from 'express';
import type { ForceChangePasswordDto } from 'modules/auth/dtos/force-change-password.dto';
import type { LoginDto } from 'modules/auth/dtos/login.dto';
import type { RegisterDto } from 'modules/auth/dtos/register.dto';

import { JweService } from './jwe.service';
import { AuthRepository } from './repository/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepositoryService: AuthRepository,
    private readonly jweService: JweService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepositoryService.checkUserExists(dto.email);
    if (existing !== undefined && existing !== null) {
      throw new ConflictException('A user with this email already exists');
    }
    const userRole = await this.authRepositoryService.getRoleByName('USER');
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.authRepositoryService.createUser(dto, hashedPassword, userRole?.id ?? null);
    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      isPasswordChangeRequired: user.isPasswordChangeRequired,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;

    const user = await this.authRepositoryService.getUserByEmail(email);

    if (user === null || user === undefined) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password as string);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isPasswordChangeRequired) {
      return {
        message: 'PASSWORD_CHANGE_REQUIRED',
        email: user.email,
      };
    }

    await this.authRepositoryService.updateLastLogin(user.id);

    const token = await this.jweService.issueToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const tokenHours = this.configService.get<number>('authTokenExpirationHours') ?? 24;
    const maxAgeMs = tokenHours * 60 * 60 * 1000;

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
        role: user.roleId != null && user.role != null ? { id: user.roleId, name: user.role } : null,
        isVerified: user.isVerified,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
      },
    };
  }

  async forceChangePassword(dto: ForceChangePasswordDto, res: Response) {
    const { email, temporaryPassword, newPassword } = dto;

    const user = await this.authRepositoryService.getUserByEmail(email);

    if (user === null || user === undefined) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(temporaryPassword, user.password as string);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isPasswordChangeRequired) {
      throw new BadRequestException('Password change is not required for this account');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.authRepositoryService.updatePasswordAndRemoveChangeFlag(user.id, hashedNewPassword);
    await this.authRepositoryService.updateLastLogin(user.id);

    const token = await this.jweService.issueToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const tokenHours = this.configService.get<number>('authTokenExpirationHours') ?? 24;
    const maxAgeMs = tokenHours * 60 * 60 * 1000;
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
        isPasswordChangeRequired: false,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepositoryService.getUserById(userId);

    if (user === null || user === undefined) {
      throw new NotFoundException('User not found');
    }

    const permissions = user.roleId ? await this.authRepositoryService.getUserPermissionsByRoleId(user.roleId) : [];

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roleId != null && user.role != null ? { id: user.roleId, name: user.role } : null,
      createdAt: user.createdAt,
      permissions,
    };
  }
  logout(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
}
