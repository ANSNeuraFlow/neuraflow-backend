import { Injectable, Logger } from '@nestjs/common';
import { BridgeAuthRepository } from 'modules/bridge-auth/repository/bridge-auth.repository';
import { v7 as uuidv7 } from 'uuid';

import type { RegisterDeviceDto } from './dtos';
import type { BridgeDeviceModel } from './models';
import { BridgeDeviceRepository } from './repository/bridge-device.repository';

@Injectable()
export class BridgeDeviceService {
  private readonly logger = new Logger(BridgeDeviceService.name);

  constructor(
    private readonly deviceRepo: BridgeDeviceRepository,
    private readonly bridgeAuthRepo: BridgeAuthRepository,
  ) {}

  async registerDevice(
    userId: string,
    tokenId: string,
    dto: RegisterDeviceDto,
    ip?: string,
  ): Promise<BridgeDeviceModel> {
    const deviceId = `bridge_device_${uuidv7()}`;

    const device = await this.deviceRepo.create({
      id: deviceId,
      userId,
      deviceName: dto.deviceName,
      platform: dto.platform,
      version: dto.version,
    });

    await this.bridgeAuthRepo.updateTokenDevice(tokenId, deviceId);

    this.logger.log({
      msg: 'bridge device registered',
      userId,
      deviceId,
      ip,
    });

    return device;
  }

  async listUserDevices(userId: string): Promise<BridgeDeviceModel[]> {
    return this.deviceRepo.findAllByUserId(userId);
  }
}
