import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';

import { BridgeDeviceModel } from '../models';

@Injectable()
export class BridgeDeviceRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async create(input: {
    id: string;
    userId: string;
    deviceName: string;
    platform: string;
    version: string;
  }): Promise<BridgeDeviceModel> {
    const result = await this.db.insertInto('bridgeDevices').values(input).returningAll().executeTakeFirstOrThrow();
    return BridgeDeviceModel.fromResult(result);
  }

  async findById(id: string): Promise<BridgeDeviceModel | null> {
    const result = await this.db.selectFrom('bridgeDevices').selectAll().where('id', '=', id).executeTakeFirst();
    return result ? BridgeDeviceModel.fromResult(result) : null;
  }

  async findAllByUserId(userId: string): Promise<BridgeDeviceModel[]> {
    const results = await this.db
      .selectFrom('bridgeDevices')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();
    return results.map((row) => BridgeDeviceModel.fromResult(row));
  }
}
