import type { ModelStatus } from 'common/enums';
import type { MlModel } from 'database/schema/ml-model';

export class MlModelModel {
  id: string;
  userId: string;
  trainingJobId: string;
  sessionId: string;
  name: string;
  status: ModelStatus;
  accuracy: number | null;
  filePath: string | null;
  fileSize: number | null;
  trainedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(model: MlModel) {
    this.id = model.id;
    this.userId = model.userId;
    this.trainingJobId = model.trainingJobId;
    this.sessionId = model.sessionId;
    this.name = model.name;
    this.status = model.status;
    this.accuracy = model.accuracy;
    this.filePath = model.filePath;
    this.fileSize = model.fileSize;
    this.trainedAt = model.trainedAt;
    this.createdAt = model.createdAt;
    this.updatedAt = model.updatedAt;
  }

  static fromResult(this: void, model: MlModel): MlModelModel {
    return new MlModelModel(model);
  }
}
