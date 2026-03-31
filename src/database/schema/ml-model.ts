import type { ModelStatus } from 'common/enums';
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt, OptionalAt, UpdatedAt } from './common';

export interface MlModelTable {
  id: Generated<string>;
  userId: string;
  trainingJobId: string;
  sessionId: string;
  name: string;
  status: ModelStatus;
  accuracy: number | null;
  filePath: string | null;
  fileSize: number | null;
  trainedAt: OptionalAt;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}

export type MlModel = Selectable<MlModelTable>;
export type MlModelCreate = Insertable<MlModelTable>;
export type MlModelUpdate = Updateable<MlModelTable>;
