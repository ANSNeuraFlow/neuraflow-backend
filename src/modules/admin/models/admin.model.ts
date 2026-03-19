export interface AdminUserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number | null;
  role?: string | null;
}

export interface AdminUserListItemModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  isPasswordChangeRequired: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  roleId: number | null;
  role: string | null;
}
