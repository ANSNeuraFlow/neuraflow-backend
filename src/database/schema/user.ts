import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt, OptionalAt, UpdatedAt } from './common';

export interface UserTable {
  id: Generated<string>;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isVerified: Generated<boolean>;
  isPasswordChangeRequired: Generated<boolean>;
  roleId: number | null;
  lastLogin: OptionalAt;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}

export type User = Selectable<UserTable>;
export type UserCreate = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
