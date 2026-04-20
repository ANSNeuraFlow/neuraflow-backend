import { createHash, randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig, BridgeConfig } from 'config/configuration';

import type { BridgeAuthStartDto, BridgeAuthTokenDto } from './dtos';
import { BridgeAuthRepository } from './repository/bridge-auth.repository';

export interface BridgeAuthStartResult {
  code: string;
  state: string;
  redirectUri: string;
}

export interface BridgeAuthTokenResult {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: { id: string; email: string };
}

@Injectable()
export class BridgeAuthService {
  constructor(
    private readonly repo: BridgeAuthRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private get bridgeConfig(): BridgeConfig {
    const config = this.configService.get<BridgeConfig>('bridge');
    if (!config) {
      throw new Error('Bridge configuration is missing');
    }
    return config;
  }

  async startAuthFlow(userId: string, dto: BridgeAuthStartDto): Promise<BridgeAuthStartResult> {
    const { clientId, redirectUri, state } = dto;

    if (!this.bridgeConfig.allowedClientIds.includes(clientId)) {
      throw new BadRequestException(`Unknown client_id: ${clientId}`);
    }

    const code = randomBytes(32).toString('hex');
    const ttlMs = this.bridgeConfig.authCodeTtlMinutes * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.repo.createAuthCode({ userId, code, clientId, redirectUri, expiresAt });

    return { code, state, redirectUri };
  }

  async exchangeCodeForToken(dto: BridgeAuthTokenDto): Promise<BridgeAuthTokenResult> {
    const { code, clientId } = dto;

    const authCode = await this.repo.findUnusedCode(code);
    if (!authCode) {
      throw new UnauthorizedException('Invalid or already used code');
    }
    if (authCode.isExpired()) {
      throw new UnauthorizedException('Code expired');
    }
    if (authCode.clientId !== clientId) {
      throw new UnauthorizedException('client_id mismatch');
    }

    await this.repo.markCodeAsUsed(authCode.id);

    const rawToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const ttlHours = this.bridgeConfig.tokenTtlHours;
    const expiresInSeconds = ttlHours * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.repo.createToken({
      userId: authCode.userId,
      tokenHash,
      expiresAt,
    });

    const user = await this.repo.getUserById(authCode.userId);
    if (!user) {
      throw new NotFoundException('User no longer exists');
    }

    return {
      access_token: rawToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      user: { id: user.id, email: user.email },
    };
  }
}
