import type { TrainingJobStatus } from 'common/enums';
import type { TrainingJob } from 'database/schema/training-job';

export class TrainingJobModel {
  id: string;
  userId: string;
  sessionIds: string[];
  rayJobId: string | null;
  status: TrainingJobStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(job: TrainingJob) {
    this.id = job.id;
    this.userId = job.userId;
    this.sessionIds = job.sessionIds;
    this.rayJobId = job.rayJobId;
    this.status = job.status;
    this.errorMessage = job.errorMessage;
    this.createdAt = job.createdAt;
    this.updatedAt = job.updatedAt;
  }

  static fromResult(this: void, job: TrainingJob): TrainingJobModel {
    return new TrainingJobModel(job);
  }
}
