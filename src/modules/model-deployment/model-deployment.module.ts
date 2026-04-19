import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ModelDeploymentController } from 'modules/model-deployment/model-deployment.controller';
import { ModelDeploymentScheduler } from 'modules/model-deployment/model-deployment.scheduler';
import { ModelDeploymentService } from 'modules/model-deployment/model-deployment.service';
import { ModelDeploymentRepository } from 'modules/model-deployment/repository/model-deployment.repository';

import { AuthModule } from '../auth/auth.module';
import { MlModelsModule } from '../ml-models/ml-models.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 3,
    }),
    AuthModule,
    MlModelsModule,
  ],
  controllers: [ModelDeploymentController],
  providers: [ModelDeploymentService, ModelDeploymentRepository, ModelDeploymentScheduler],
})
export class ModelDeploymentModule {}
