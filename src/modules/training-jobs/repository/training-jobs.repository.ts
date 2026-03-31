import { Inject, Injectable } from '@nestjs/common';
import { TrainingJobStatus } from 'common/enums';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import { TrainingJobModel } from '../models/training-job.model';

@Injectable()
export class TrainingJobsRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async create(userId: string, sessionIds: string[]): Promise<TrainingJobModel> {
    const result = await this.db
      .insertInto('trainingJobs')
      .values({
        id: uuidv7(),
        userId,
        sessionIds,
        status: TrainingJobStatus.PENDING,
        rayJobId: null,
        errorMessage: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return TrainingJobModel.fromResult(result);
  }

  async findById(id: string): Promise<TrainingJobModel | null> {
    const result = await this.db.selectFrom('trainingJobs').selectAll().where('id', '=', id).executeTakeFirst();

    return result ? TrainingJobModel.fromResult(result) : null;
  }

  async findAllByUserId(userId: string): Promise<TrainingJobModel[]> {
    const results = await this.db
      .selectFrom('trainingJobs')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    return results.map(TrainingJobModel.fromResult);
  }

  async updateRayJobId(id: string, rayJobId: string): Promise<TrainingJobModel | null> {
    const result = await this.db
      .updateTable('trainingJobs')
      .set({ rayJobId, status: TrainingJobStatus.RUNNING })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    return result ? TrainingJobModel.fromResult(result) : null;
  }

  async updateResult(id: string, status: TrainingJobStatus, errorMessage?: string): Promise<void> {
    await this.db
      .updateTable('trainingJobs')
      .set({ status, errorMessage: errorMessage ?? null })
      .where('id', '=', id)
      .execute();
  }
}
