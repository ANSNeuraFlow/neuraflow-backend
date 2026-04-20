import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { BridgeAuthCodeCreate } from 'database/schema/bridge-auth-code';
import type { BridgeTokenCreate } from 'database/schema/bridge-token';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import { BridgeAuthCodeModel, BridgeTokenModel } from '../models';

@Injectable()
export class BridgeAuthRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async createAuthCode(input: {
    userId: string;
    code: string;
    clientId: string;
    redirectUri: string;
    expiresAt: Date;
  }): Promise<BridgeAuthCodeModel> {
    const row: BridgeAuthCodeCreate = {
      id: uuidv7(),
      userId: input.userId,
      code: input.code,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
    };

    const result = await this.db.insertInto('bridgeAuthCodes').values(row).returningAll().executeTakeFirstOrThrow();

    return BridgeAuthCodeModel.fromResult(result);
  }

  async findUnusedCode(code: string): Promise<BridgeAuthCodeModel | null> {
    const result = await this.db
      .selectFrom('bridgeAuthCodes')
      .selectAll()
      .where('code', '=', code)
      .where('used', '=', false)
      .executeTakeFirst();

    return result ? BridgeAuthCodeModel.fromResult(result) : null;
  }

  async markCodeAsUsed(id: string): Promise<void> {
    await this.db.updateTable('bridgeAuthCodes').set({ used: true }).where('id', '=', id).execute();
  }

  async createToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<BridgeTokenModel> {
    const row: BridgeTokenCreate = {
      id: uuidv7(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    };

    const result = await this.db.insertInto('bridgeTokens').values(row).returningAll().executeTakeFirstOrThrow();

    return BridgeTokenModel.fromResult(result);
  }

  async findTokenByHash(tokenHash: string): Promise<BridgeTokenModel | null> {
    const result = await this.db
      .selectFrom('bridgeTokens')
      .selectAll()
      .where('tokenHash', '=', tokenHash)
      .executeTakeFirst();

    return result ? BridgeTokenModel.fromResult(result) : null;
  }

  async updateTokenDevice(tokenId: string, deviceId: string): Promise<void> {
    await this.db.updateTable('bridgeTokens').set({ deviceId }).where('id', '=', tokenId).execute();
  }

  async getUserById(userId: string) {
    return this.db.selectFrom('users').select(['id', 'email']).where('id', '=', userId).executeTakeFirst();
  }
}
