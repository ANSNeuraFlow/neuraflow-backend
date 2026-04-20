import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt } from './common';

export interface BridgeTokenTable {
  id: Generated<string>;
  userId: string;
  deviceId: string | null;
  tokenHash: string;
  scope: Generated<string>;
  createdAt: CreatedAt;
  expiresAt: Date;
}

export type BridgeToken = Selectable<BridgeTokenTable>;
export type BridgeTokenCreate = Insertable<BridgeTokenTable>;
export type BridgeTokenUpdate = Updateable<BridgeTokenTable>;
