import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BridgeAuthModule } from '../bridge-auth/bridge-auth.module';
import { EegStreamModule } from '../eeg-stream/eeg-stream.module';
import { SessionsModule } from '../sessions/sessions.module';
import { BridgeStreamController } from './bridge-stream.controller';
import { BridgeStreamService } from './bridge-stream.service';

@Module({
  imports: [BridgeAuthModule, AuthModule, EegStreamModule, SessionsModule],
  controllers: [BridgeStreamController],
  providers: [BridgeStreamService],
  exports: [BridgeStreamService],
})
export class BridgeStreamModule {}
