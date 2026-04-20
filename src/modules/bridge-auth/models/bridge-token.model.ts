import type { BridgeToken } from 'database/schema/bridge-token';

type BridgeTokenQueryResult = Partial<BridgeToken>;

export class BridgeTokenModel {
  id: string;
  userId: string;
  deviceId: string | null;
  tokenHash: string;
  scope: string;
  createdAt: Date;
  expiresAt: Date;

  constructor(row: BridgeTokenQueryResult) {
    this.id = row.id!;
    this.userId = row.userId!;
    this.deviceId = row.deviceId ?? null;
    this.tokenHash = row.tokenHash!;
    this.scope = row.scope!;
    this.createdAt = row.createdAt as Date;
    this.expiresAt = row.expiresAt!;
  }

  static fromResult(result: BridgeTokenQueryResult): BridgeTokenModel {
    return new BridgeTokenModel(result);
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
