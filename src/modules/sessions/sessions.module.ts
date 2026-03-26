import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SessionsRepository } from './repository/sessions.repository';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuthModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}
