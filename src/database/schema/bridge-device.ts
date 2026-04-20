import type { Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt } from './common';

export interface BridgeDeviceTable {
  id: string;
  userId: string;
  deviceName: string;
  platform: string;
  version: string;
  createdAt: CreatedAt;
}

export type BridgeDevice = Selectable<BridgeDeviceTable>;
export type BridgeDeviceCreate = Insertable<BridgeDeviceTable>;
export type BridgeDeviceUpdate = Updateable<BridgeDeviceTable>;
