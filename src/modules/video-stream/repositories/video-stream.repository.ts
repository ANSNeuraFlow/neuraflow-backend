import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import type { DroneVideoStreamCreate, DroneVideoStreamStatus } from 'database/schema/drone-video-stream';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import { DroneVideoStreamModel } from '../models';

@Injectable()
export class VideoStreamRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  private generateStreamKey(): string {
    return randomBytes(16).toString('hex');
  }

  async createStream(input: {
    bridgeTokenId: string;
    userId: string;
    rtmpIngestUrl: string;
  }): Promise<DroneVideoStreamModel> {
    const row: DroneVideoStreamCreate = {
      id: uuidv7(),
      bridgeTokenId: input.bridgeTokenId,
      userId: input.userId,
      streamKey: this.generateStreamKey(),
      status: 'pending',
      rtmpIngestUrl: input.rtmpIngestUrl,
      startedAt: null,
      endedAt: null,
    };

    const result = await this.db.insertInto('droneVideoStreams').values(row).returningAll().executeTakeFirstOrThrow();

    return DroneVideoStreamModel.fromResult(result);
  }

  async findByStreamKey(streamKey: string): Promise<DroneVideoStreamModel | null> {
    const result = await this.db
      .selectFrom('droneVideoStreams')
      .selectAll()
      .where('streamKey', '=', streamKey)
      .executeTakeFirst();

    return result ? DroneVideoStreamModel.fromResult(result) : null;
  }

  async findActiveByUserId(userId: string): Promise<DroneVideoStreamModel | null> {
    const result = await this.db
      .selectFrom('droneVideoStreams')
      .selectAll()
      .where('userId', '=', userId)
      .where('status', 'in', ['pending', 'active'])
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();

    return result ? DroneVideoStreamModel.fromResult(result) : null;
  }

  async findActiveByBridgeTokenId(bridgeTokenId: string): Promise<DroneVideoStreamModel | null> {
    const result = await this.db
      .selectFrom('droneVideoStreams')
      .selectAll()
      .where('bridgeTokenId', '=', bridgeTokenId)
      .where('status', 'in', ['pending', 'active'])
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();

    return result ? DroneVideoStreamModel.fromResult(result) : null;
  }

  async updateRtmpIngestUrl(id: string, rtmpIngestUrl: string): Promise<void> {
    await this.db.updateTable('droneVideoStreams').set({ rtmpIngestUrl }).where('id', '=', id).execute();
  }

  async updateStatus(
    id: string,
    status: DroneVideoStreamStatus,
    timestamps?: { startedAt?: Date; endedAt?: Date },
  ): Promise<void> {
    await this.db
      .updateTable('droneVideoStreams')
      .set({
        status,
        ...(timestamps?.startedAt ? { startedAt: timestamps.startedAt } : {}),
        ...(timestamps?.endedAt ? { endedAt: timestamps.endedAt } : {}),
      })
      .where('id', '=', id)
      .execute();
  }

  async findStaleStreams(olderThan: Date): Promise<DroneVideoStreamModel[]> {
    const results = await this.db
      .selectFrom('droneVideoStreams')
      .selectAll()
      .where('status', 'in', ['pending', 'active'])
      .where('createdAt', '<', olderThan)
      .execute();

    return results.map((row) => DroneVideoStreamModel.fromResult(row));
  }

  async endPendingStreamsForBridge(bridgeTokenId: string): Promise<void> {
    await this.db
      .updateTable('droneVideoStreams')
      .set({ status: 'ended', endedAt: new Date() })
      .where('bridgeTokenId', '=', bridgeTokenId)
      .where('status', 'in', ['pending', 'active'])
      .execute();
  }
}
