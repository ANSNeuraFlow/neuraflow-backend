import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MlModelsController } from './ml-models.controller';
import { MlModelsService } from './ml-models.service';
import { MlModelsRepository } from './repository/ml-models.repository';

@Module({
  imports: [AuthModule],
  controllers: [MlModelsController],
  providers: [MlModelsService, MlModelsRepository],
  exports: [MlModelsService, MlModelsRepository],
})
export class MlModelsModule {}
