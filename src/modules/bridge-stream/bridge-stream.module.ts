import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BridgeAuthModule } from '../bridge-auth/bridge-auth.module';
import { BridgeStreamController } from './bridge-stream.controller';
import { BridgeStreamService } from './bridge-stream.service';

@Module({
  imports: [BridgeAuthModule, AuthModule],
  controllers: [BridgeStreamController],
  providers: [BridgeStreamService],
  exports: [BridgeStreamService],
})
export class BridgeStreamModule {}
