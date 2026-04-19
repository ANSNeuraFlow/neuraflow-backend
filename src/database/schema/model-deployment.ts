import type { DeploymentStatus } from 'common/enums';
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt, OptionalAt, UpdatedAt } from './common';

export interface ModelDeploymentTable {
  id: Generated<string>;
  userId: string;
  mlModelId: string;
  status: DeploymentStatus;
  rayAppName: string | null;
  serveEndpointUrl: string | null;
  errorMessage: string | null;
  startedAt: OptionalAt;
  stoppedAt: OptionalAt;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}

export type ModelDeployment = Selectable<ModelDeploymentTable>;
export type ModelDeploymentCreate = Insertable<ModelDeploymentTable>;
export type ModelDeploymentUpdate = Updateable<ModelDeploymentTable>;
