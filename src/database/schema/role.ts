import type { Generated, Insertable, Selectable } from 'kysely';

import type { CreatedAt } from './common';

export interface RoleTable {
  id: Generated<number>;
  name: string;
  createdAt: CreatedAt;
}

export type Role = Selectable<RoleTable>;
export type RoleCreate = Insertable<RoleTable>;
