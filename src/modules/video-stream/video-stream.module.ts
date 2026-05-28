import { Module } from '@nestjs/common';
import { AuthModule } from 'modules/auth/auth.module';
import { BridgeAuthModule } from 'modules/bridge-auth/bridge-auth.module';

import { VideoStreamRepository } from './repositories/video-stream.repository';
import { VideoStreamController } from './video-stream.controller';
import { VideoStreamService } from './video-stream.service';

@Module({
  imports: [AuthModule, BridgeAuthModule],
  controllers: [VideoStreamController],
  providers: [VideoStreamRepository, VideoStreamService],
  exports: [VideoStreamService],
})
export class VideoStreamModule {}
