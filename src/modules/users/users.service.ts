import { Injectable, NotFoundException } from '@nestjs/common';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersRepository } from './repository/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const [profile, stats] = await Promise.all([
      this.usersRepository.getProfileById(userId),
      this.usersRepository.getUserStats(userId),
    ]);

    if (profile == null) {
      throw new NotFoundException('User not found');
    }

    const permissions = profile.roleId != null ? await this.usersRepository.getPermissionsByRoleId(profile.roleId) : [];

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      phoneNumber: profile.phoneNumber,
      dateOfBirth: profile.dateOfBirth,
      isVerified: profile.isVerified,
      lastLogin: profile.lastLogin,
      createdAt: profile.createdAt,
      role: profile.roleId != null && profile.roleName != null ? { id: profile.roleId, name: profile.roleName } : null,
      permissions,
      stats,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const id = await this.usersRepository.updateProfile(userId, dto);
    if (id == null) {
      throw new NotFoundException('User not found');
    }
    return this.getProfile(userId);
  }
}
