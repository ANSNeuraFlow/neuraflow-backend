import type { User } from 'database/schema/user';

type UserQueryResult = Partial<User & { role?: string | null }>;

export class UserModel {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  isPasswordChangeRequired: boolean;
  role?: string | null;

  constructor(user: UserQueryResult) {
    this.id = user.id!;
    this.email = user.email!;
    this.password = user.password;
    this.firstName = user.firstName!;
    this.lastName = user.lastName!;
    this.isVerified = user.isVerified!;
    this.isPasswordChangeRequired = user.isPasswordChangeRequired!;
    this.role = user.role;
  }

  static fromResult(result: UserQueryResult): UserModel {
    return new UserModel(result);
  }
}
