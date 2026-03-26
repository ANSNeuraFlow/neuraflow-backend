import type { SessionStatus } from 'common/enums';
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt, OptionalAt, UpdatedAt } from './common';

export interface EegSessionTable {
  id: Generated<string>;
  userId: string;
  deviceName: string;
  protocolName: string;
  status: SessionStatus;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  startedAt: OptionalAt;
  endedAt: OptionalAt;
}

export type EegSession = Selectable<EegSessionTable>;
export type EegSessionCreate = Insertable<EegSessionTable>;
export type EegSessionUpdate = Updateable<EegSessionTable>;
