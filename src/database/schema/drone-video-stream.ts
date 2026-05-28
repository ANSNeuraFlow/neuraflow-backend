import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt } from './common';

export type DroneVideoStreamStatus = 'pending' | 'active' | 'ended';

export interface DroneVideoStreamTable {
  id: Generated<string>;
  bridgeTokenId: string;
  userId: string;
  streamKey: string;
  status: DroneVideoStreamStatus;
  rtmpIngestUrl: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: CreatedAt;
}

export type DroneVideoStream = Selectable<DroneVideoStreamTable>;
export type DroneVideoStreamCreate = Insertable<DroneVideoStreamTable>;
export type DroneVideoStreamUpdate = Updateable<DroneVideoStreamTable>;
