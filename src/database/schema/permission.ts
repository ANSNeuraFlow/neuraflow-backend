import type { Generated, Insertable, Selectable } from 'kysely';

export interface PermissionTable {
  id: Generated<number>;
  name: string;
}

export interface RolePermissionTable {
  roleId: number;
  permissionId: number;
}

export type Permission = Selectable<PermissionTable>;
export type PermissionCreate = Insertable<PermissionTable>;
