import { Inject, Injectable } from '@nestjs/common';
import { DeploymentStatus } from 'common/enums';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import { DeploymentModel } from '../models/deployment.model';

@Injectable()
export class ModelDeploymentRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async create(userId: string, mlModelId: string, rayAppName: string): Promise<DeploymentModel> {
    const result = await this.db
      .insertInto('modelDeployments')
      .values({
        id: uuidv7(),
        userId,
        mlModelId,
        status: DeploymentStatus.PENDING,
        rayAppName,
        serveEndpointUrl: null,
        errorMessage: null,
        startedAt: null,
        stoppedAt: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return DeploymentModel.fromResult(result);
  }

  async findByIdAndUserId(id: string, userId: string): Promise<DeploymentModel | null> {
    const result = await this.db
      .selectFrom('modelDeployments')
      .selectAll()
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst();

    return result ? DeploymentModel.fromResult(result) : null;
  }

  async findActiveByModelId(userId: string, mlModelId: string): Promise<DeploymentModel | null> {
    const result = await this.db
      .selectFrom('modelDeployments')
      .selectAll()
      .where('userId', '=', userId)
      .where('mlModelId', '=', mlModelId)
      .where('status', 'in', [DeploymentStatus.STARTING, DeploymentStatus.RUNNING])
      .executeTakeFirst();

    return result ? DeploymentModel.fromResult(result) : null;
  }

  async findAllByUserId(userId: string): Promise<DeploymentModel[]> {
    const results = await this.db
      .selectFrom('modelDeployments')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    return results.map(DeploymentModel.fromResult);
  }

  async findAllInTransitionalStatuses(): Promise<DeploymentModel[]> {
    const results = await this.db
      .selectFrom('modelDeployments')
      .selectAll()
      .where('status', 'in', [DeploymentStatus.STARTING, DeploymentStatus.STOPPING])
      .execute();

    return results.map(DeploymentModel.fromResult);
  }

  async updateStatus(
    id: string,
    status: DeploymentStatus,
    extra: {
      serveEndpointUrl?: string | null;
      errorMessage?: string | null;
      startedAt?: Date | null;
      stoppedAt?: Date | null;
    } = {},
  ): Promise<DeploymentModel | null> {
    const result = await this.db
      .updateTable('modelDeployments')
      .set({ status, ...extra })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? DeploymentModel.fromResult(result) : null;
  }
}
