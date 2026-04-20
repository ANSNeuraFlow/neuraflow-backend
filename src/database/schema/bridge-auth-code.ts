import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt } from './common';

export interface BridgeAuthCodeTable {
  id: Generated<string>;
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  used: Generated<boolean>;
  createdAt: CreatedAt;
  expiresAt: Date;
}

export type BridgeAuthCode = Selectable<BridgeAuthCodeTable>;
export type BridgeAuthCodeCreate = Insertable<BridgeAuthCodeTable>;
export type BridgeAuthCodeUpdate = Updateable<BridgeAuthCodeTable>;
