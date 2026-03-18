import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthRepositoryService } from './auth-repository.service';
import { JweService } from './jwe.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepositoryService, AuthGuard, JweService],
  exports: [AuthService, AuthGuard, JweService],
})
export class AuthModule {}
