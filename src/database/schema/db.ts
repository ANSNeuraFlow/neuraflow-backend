import type { EegSessionTable } from './eeg-session';
import type { PermissionTable, RolePermissionTable } from './permission';
import type { RoleTable } from './role';
import type { SeedHistoryTable } from './seed';
import type { UserTable } from './user';

export interface DB {
  seedHistory: SeedHistoryTable;
  roles: RoleTable;
  permissions: PermissionTable;
  rolePermissions: RolePermissionTable;
  users: UserTable;
  eegSessions: EegSessionTable;
}
