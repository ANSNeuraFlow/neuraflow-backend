import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BridgeAuthController } from './bridge-auth.controller';
import { BridgeAuthGuard } from './bridge-auth.guard';
import { BridgeAuthService } from './bridge-auth.service';
import { BridgeAuthRepository } from './repository/bridge-auth.repository';

@Module({
  imports: [AuthModule],
  controllers: [BridgeAuthController],
  providers: [BridgeAuthService, BridgeAuthRepository, BridgeAuthGuard],
  exports: [BridgeAuthGuard, BridgeAuthRepository],
})
export class BridgeAuthModule {}
