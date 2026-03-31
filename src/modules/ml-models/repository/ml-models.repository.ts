import { Inject, Injectable } from '@nestjs/common';
import { ModelStatus } from 'common/enums';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import { MlModelModel } from '../models/ml-model.model';

export interface CreateMlModelData {
  userId: string;
  trainingJobId: string;
  sessionId: string;
  name: string;
  accuracy: number;
  filePath: string;
}

@Injectable()
export class MlModelsRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async findAllByUserId(userId: string): Promise<MlModelModel[]> {
    const results = await this.db
      .selectFrom('mlModels')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    return results.map(MlModelModel.fromResult);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<MlModelModel | null> {
    const result = await this.db
      .selectFrom('mlModels')
      .selectAll()
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst();

    return result ? MlModelModel.fromResult(result) : null;
  }

  async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('mlModels')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst();

    return result.numDeletedRows > 0n;
  }

  async create(data: CreateMlModelData): Promise<MlModelModel> {
    const result = await this.db
      .insertInto('mlModels')
      .values({
        id: uuidv7(),
        userId: data.userId,
        trainingJobId: data.trainingJobId,
        sessionId: data.sessionId,
        name: data.name,
        status: ModelStatus.READY,
        accuracy: data.accuracy,
        filePath: data.filePath,
        fileSize: null,
        trainedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return MlModelModel.fromResult(result);
  }
}
