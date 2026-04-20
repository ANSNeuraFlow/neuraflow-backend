import type { BridgeDevice } from 'database/schema/bridge-device';

type BridgeDeviceQueryResult = Partial<BridgeDevice>;

export class BridgeDeviceModel {
  id: string;
  userId: string;
  deviceName: string;
  platform: string;
  version: string;
  createdAt: Date;

  constructor(row: BridgeDeviceQueryResult) {
    this.id = row.id!;
    this.userId = row.userId!;
    this.deviceName = row.deviceName!;
    this.platform = row.platform!;
    this.version = row.version!;
    this.createdAt = row.createdAt as Date;
  }

  static fromResult(result: BridgeDeviceQueryResult): BridgeDeviceModel {
    return new BridgeDeviceModel(result);
  }
}
