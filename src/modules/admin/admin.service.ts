import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import type { CreateAdminUserDto } from './dtos/create-admin-user.dto';
import type { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { AdminRepository } from './repository/admin.repository';
import { AdminQueryService } from './services/admin-query.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminQueryService: AdminQueryService,
  ) {}

  async createUser(dto: CreateAdminUserDto) {
    const existing = await this.adminQueryService.checkUserExistsByEmail(dto.email);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    let roleId: number | null = dto.roleId ?? null;
    if (!roleId) {
      const userRole = await this.adminQueryService.getRoleByName('USER');
      roleId = userRole?.id ?? null;
    }
    const hashedPassword = await bcrypt.hash(dto.temporaryPassword, 10);

    const user = await this.adminRepository.createUser(dto, hashedPassword, roleId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
      isPasswordChangeRequired: user.isPasswordChangeRequired,
      roleId: user.roleId,
    };
  }

  async getUsers() {
    const users = await this.adminQueryService.getAllUsers();

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isVerified: u.isVerified,
      isPasswordChangeRequired: u.isPasswordChangeRequired,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      roleId: u.roleId,
      role: u.role,
    }));
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    const user = await this.adminQueryService.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.adminRepository.updateUserRole(userId, dto.roleId);

    return {
      id: updated!.id,
      email: updated!.email,
      roleId: updated!.roleId,
    };
  }

  async deleteUser(userId: string, requestingAdminId: string) {
    if (userId === requestingAdminId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.adminQueryService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.adminRepository.deleteUser(userId);
  }
}
