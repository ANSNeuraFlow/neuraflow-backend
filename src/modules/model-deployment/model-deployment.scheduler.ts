import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { AppConfig } from 'config/configuration';

import { ModelDeploymentService } from './model-deployment.service';

@Injectable()
export class ModelDeploymentScheduler implements OnModuleInit {
  private readonly logger = new Logger(ModelDeploymentScheduler.name);

  constructor(
    private readonly modelDeploymentService: ModelDeploymentService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit() {
    const intervalMs = this.config.get('ray', { infer: true }).syncIntervalMs;

    const interval = setInterval(() => {
      void this.runDeploymentStatusSync();
    }, intervalMs);

    this.schedulerRegistry.addInterval('model-deployment-sync', interval);
    this.logger.log(`Deployment sync scheduled every ${intervalMs}ms`);
  }

  private async runDeploymentStatusSync(): Promise<void> {
    try {
      await this.modelDeploymentService.syncRayStatuses();
    } catch (error) {
      this.logger.error('Error during deployment status sync', error);
    }
  }
}
