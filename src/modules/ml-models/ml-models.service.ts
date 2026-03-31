import { Injectable } from '@nestjs/common';
import { NotFoundHttpException } from 'common/exceptions/http';

import type { MlModelModel } from './models/ml-model.model';
import { MlModelsRepository } from './repository/ml-models.repository';

@Injectable()
export class MlModelsService {
  constructor(private readonly mlModelsRepository: MlModelsRepository) {}

  async findAllForUser(userId: string): Promise<MlModelModel[]> {
    return this.mlModelsRepository.findAllByUserId(userId);
  }

  async findOne(userId: string, modelId: string): Promise<MlModelModel> {
    const model = await this.mlModelsRepository.findByIdAndUserId(modelId, userId);

    if (!model) {
      throw new NotFoundHttpException(`Model ${modelId}`);
    }

    return model;
  }

  async delete(userId: string, modelId: string): Promise<void> {
    const deleted = await this.mlModelsRepository.deleteByIdAndUserId(modelId, userId);

    if (!deleted) {
      throw new NotFoundHttpException(`Model ${modelId}`);
    }
  }
}
