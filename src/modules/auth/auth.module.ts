import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JweService } from './jwe.service';
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, JweService],
  exports: [AuthService, AuthGuard, JweService],
})
export class AuthModule {}
