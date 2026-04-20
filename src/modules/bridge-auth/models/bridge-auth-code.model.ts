import type { BridgeAuthCode } from 'database/schema/bridge-auth-code';

type BridgeAuthCodeQueryResult = Partial<BridgeAuthCode>;

export class BridgeAuthCodeModel {
  id: string;
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  used: boolean;
  createdAt: Date;
  expiresAt: Date;

  constructor(row: BridgeAuthCodeQueryResult) {
    this.id = row.id!;
    this.code = row.code!;
    this.userId = row.userId!;
    this.clientId = row.clientId!;
    this.redirectUri = row.redirectUri!;
    this.used = row.used!;
    this.createdAt = row.createdAt as Date;
    this.expiresAt = row.expiresAt!;
  }

  static fromResult(result: BridgeAuthCodeQueryResult): BridgeAuthCodeModel {
    return new BridgeAuthCodeModel(result);
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
