import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStatus, TrainingJobStatus } from 'common/enums';
import { ForbiddenHttpException, NotFoundHttpException } from 'common/exceptions/http';
import type { AppConfig } from 'config/configuration';
import { MlModelsRepository } from 'modules/ml-models/repository/ml-models.repository';
import { SessionsRepository } from 'modules/sessions/repository/sessions.repository';
import { firstValueFrom } from 'rxjs';
import { timingSafeEqual } from 'utils/auth.utils';

import type { RayWebhookDto } from './dtos/ray-webhook.dto';
import type { TrainingJobModel } from './models/training-job.model';
import { TrainingJobsRepository } from './repository/training-jobs.repository';

interface RayJobSubmitResponse {
  job_id: string;
}

@Injectable()
export class TrainingJobsService {
  private readonly logger = new Logger(TrainingJobsService.name);
  private readonly rayHeadUrl: string;
  private readonly webhookSecret: string;
  private readonly trainScriptPath: string;
  private readonly webhookUrl: string;
  verifySecret(provided: string): boolean {
    return timingSafeEqual(provided ?? '', this.webhookSecret);
  }

  constructor(
    private readonly trainingJobsRepository: TrainingJobsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly mlModelsRepository: MlModelsRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const ray = this.config.get('ray', { infer: true });
    this.rayHeadUrl = ray.headUrl;
    this.webhookSecret = ray.webhookSecret;
    this.trainScriptPath = ray.trainScriptPath;
    this.webhookUrl = ray.webhookUrl;
  }

  async dispatch(userId: string, sessionIds: string[]): Promise<TrainingJobModel> {
    const sessionChecks = await Promise.all(
      sessionIds.map(async (sessionId) => ({
        sessionId,
        session: await this.sessionsRepository.findByIdAndUserId(sessionId, userId),
      })),
    );
    for (const check of sessionChecks) {
      if (!check.session) {
        throw new NotFoundHttpException(`Session ${check.sessionId}`);
      }
      if (check.session.status !== SessionStatus.COMPLETED) {
        throw new ForbiddenHttpException(
          `Session ${check.sessionId} is not COMPLETED (status: ${check.session.status})`,
        );
      }
    }

    const job = await this.trainingJobsRepository.create(userId, sessionIds);

    const sessionsArg = sessionIds.join(',');
    const rayPayload = {
      entrypoint: `python ${this.trainScriptPath} --job-id ${job.id} --sessions ${sessionsArg}`,
      runtime_env: {
        env_vars: {
          NEURAFLOW_WEBHOOK_URL: this.webhookUrl,
          RAY_WEBHOOK_SECRET: this.webhookSecret,
        },
      },
      metadata: {
        neuraflow_job_id: job.id,
        user_id: userId,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<RayJobSubmitResponse>(`${this.rayHeadUrl}/api/jobs/`, rayPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const updatedJob = await this.trainingJobsRepository.updateRayJobId(job.id, response.data.job_id);
      this.logger.log(`Dispatched Ray job ${response.data.job_id} for training job ${job.id}`);
      return updatedJob ?? job;
    } catch (error) {
      this.logger.error(`Failed to dispatch Ray job for ${job.id}`, error);
      await this.trainingJobsRepository.updateResult(job.id, TrainingJobStatus.FAILED, 'Failed to reach Ray cluster');
      return job;
    }
  }

  async handleWebhook(dto: RayWebhookDto): Promise<void> {
    const job = await this.trainingJobsRepository.findById(dto.trainingJobId);
    if (!job) {
      throw new NotFoundHttpException(`TrainingJob ${dto.trainingJobId}`);
    }
    switch (dto.status) {
      case TrainingJobStatus.COMPLETED: {
        if (!dto.modelPath || dto.accuracy === undefined) {
          this.logger.error(`Job ${job.id} completed but missing modelPath or accuracy`);
          await this.trainingJobsRepository.updateResult(
            job.id,
            TrainingJobStatus.FAILED,
            'Missing model artifacts in Ray response',
          );
          return;
        }
        await this.trainingJobsRepository.updateResult(job.id, TrainingJobStatus.COMPLETED);
        await this.mlModelsRepository.create({
          userId: job.userId,
          trainingJobId: job.id,
          sessionId: job.sessionIds[0],
          name: `Model ${job.id.slice(0, 8)} (${new Date().toISOString().slice(0, 10)})`,
          accuracy: dto.accuracy,
          filePath: dto.modelPath,
        });
        this.logger.log(`Job ${job.id} completed. Model at ${dto.modelPath}`);
        break;
      }
      case TrainingJobStatus.RUNNING: {
        this.logger.log(`Job ${job.id} status update: RUNNING`);
        break;
      }
      case TrainingJobStatus.FAILED: {
        await this.trainingJobsRepository.updateResult(
          job.id,
          TrainingJobStatus.FAILED,
          dto.errorMessage ?? 'Unknown error from Ray',
        );
        this.logger.warn(`Job ${job.id} failed: ${dto.errorMessage}`);
        break;
      }
      default:
        this.logger.warn(`Job ${job.id} received unknown status: ${String(dto.status)}`);
    }
  }
  async findOne(userId: string, jobId: string): Promise<TrainingJobModel> {
    const job = await this.trainingJobsRepository.findById(jobId);
    if (!job || job.userId !== userId) {
      throw new NotFoundHttpException(`TrainingJob ${jobId}`);
    }
    return job;
  }
  async findAllForUser(userId: string): Promise<TrainingJobModel[]> {
    return this.trainingJobsRepository.findAllByUserId(userId);
  }
}
