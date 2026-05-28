import type { DroneVideoStream } from 'database/schema/drone-video-stream';

type DroneVideoStreamQueryResult = Partial<DroneVideoStream>;

export class DroneVideoStreamModel {
  id: string;
  bridgeTokenId: string;
  userId: string;
  streamKey: string;
  status: string;
  rtmpIngestUrl: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;

  constructor(row: DroneVideoStreamQueryResult) {
    this.id = row.id!;
    this.bridgeTokenId = row.bridgeTokenId!;
    this.userId = row.userId!;
    this.streamKey = row.streamKey!;
    this.status = row.status!;
    this.rtmpIngestUrl = row.rtmpIngestUrl!;
    this.startedAt = row.startedAt ?? null;
    this.endedAt = row.endedAt ?? null;
    this.createdAt = row.createdAt as Date;
  }

  static fromResult(result: DroneVideoStreamQueryResult): DroneVideoStreamModel {
    return new DroneVideoStreamModel(result);
  }
}
