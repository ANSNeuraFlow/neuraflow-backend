import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JweService } from './jwe.service';
import { AuthRepository } from './repository/auth.repository';
import { AuthQueryService } from './services/auth-query.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthQueryService, AuthGuard, JweService],
  exports: [AuthService, AuthQueryService, AuthGuard, JweService],
})
export class AuthModule {}
