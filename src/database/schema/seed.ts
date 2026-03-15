import type { Generated, Insertable, Selectable } from 'kysely';

export interface SeedHistoryTable {
  id: Generated<string>;
  name: string;
  env: string;
}

export type Seed = Selectable<SeedHistoryTable>;
export type SeedCreate = Insertable<SeedHistoryTable>;
