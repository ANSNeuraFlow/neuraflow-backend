import { Injectable } from '@nestjs/common';

import type { AdminUserListItemModel, AdminUserModel } from '../models/admin.model';
import { AdminRepository } from '../repository/admin.repository';

@Injectable()
export class AdminQueryService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async checkUserExistsByEmail(email: string): Promise<{ id: string } | undefined> {
    return this.adminRepository.checkUserExistsByEmail(email);
  }

  async getAllUsers(): Promise<AdminUserListItemModel[]> {
    return this.adminRepository.getAllUsers();
  }

  async getUserById(userId: string): Promise<AdminUserModel | undefined> {
    return this.adminRepository.getUserById(userId);
  }

  async getRoleByName(name: string): Promise<{ id: number; name: string } | undefined> {
    return this.adminRepository.getRoleByName(name);
  }
}
