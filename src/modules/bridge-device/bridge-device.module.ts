import { Module } from '@nestjs/common';

import { BridgeAuthModule } from '../bridge-auth/bridge-auth.module';
import { BridgeDeviceController } from './bridge-device.controller';
import { BridgeDeviceService } from './bridge-device.service';
import { BridgeDeviceRepository } from './repository/bridge-device.repository';

@Module({
  imports: [BridgeAuthModule],
  controllers: [BridgeDeviceController],
  providers: [BridgeDeviceService, BridgeDeviceRepository],
  exports: [BridgeDeviceService, BridgeDeviceRepository],
})
export class BridgeDeviceModule {}
