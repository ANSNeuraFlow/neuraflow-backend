import { Injectable } from '@nestjs/common';

import { UserModel } from '../models/user.model';
import { AuthRepository } from '../repository/auth.repository';

@Injectable()
export class AuthQueryService {
  constructor(private readonly authRepository: AuthRepository) {}

  async getUserByEmail(email: string): Promise<UserModel | null> {
    return this.authRepository.getUserByEmail(email);
  }
}
