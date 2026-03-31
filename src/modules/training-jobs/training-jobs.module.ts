import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MlModelsModule } from '../ml-models/ml-models.module';
import { SessionsModule } from '../sessions/sessions.module';
import { TrainingJobsRepository } from './repository/training-jobs.repository';
import { TrainingJobsController } from './training-jobs.controller';
import { TrainingJobsService } from './training-jobs.service';

@Module({
  imports: [HttpModule, AuthModule, SessionsModule, MlModelsModule],
  controllers: [TrainingJobsController],
  providers: [TrainingJobsService, TrainingJobsRepository],
})
export class TrainingJobsModule {}
