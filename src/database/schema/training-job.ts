import type { TrainingJobStatus } from 'common/enums';
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

import type { CreatedAt, UpdatedAt } from './common';

export interface TrainingJobTable {
  id: Generated<string>;
  userId: string;
  sessionIds: string[];
  rayJobId: string | null;
  status: TrainingJobStatus;
  errorMessage: string | null;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
}

export type TrainingJob = Selectable<TrainingJobTable>;
export type TrainingJobCreate = Insertable<TrainingJobTable>;
export type TrainingJobUpdate = Updateable<TrainingJobTable>;
