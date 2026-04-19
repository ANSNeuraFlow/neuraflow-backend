import type { DeploymentStatus } from 'common/enums';
import type { ModelDeployment } from 'database/schema/model-deployment';

export class DeploymentModel {
  id: string;
  userId: string;
  mlModelId: string;
  status: DeploymentStatus;
  rayAppName: string | null;
  serveEndpointUrl: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(row: ModelDeployment) {
    this.id = row.id;
    this.userId = row.userId;
    this.mlModelId = row.mlModelId;
    this.status = row.status;
    this.rayAppName = row.rayAppName;
    this.serveEndpointUrl = row.serveEndpointUrl;
    this.errorMessage = row.errorMessage;
    this.startedAt = row.startedAt ?? null;
    this.stoppedAt = row.stoppedAt ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }

  static fromResult(this: void, row: ModelDeployment): DeploymentModel {
    return new DeploymentModel(row);
  }
}
