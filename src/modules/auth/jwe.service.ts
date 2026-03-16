import { createSecretKey } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from 'config/configuration';
import { EncryptJWT, jwtDecrypt } from 'jose';

@Injectable()
export class JweService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly issuer = 'neuraflow-api';
  private readonly audience = 'neuraflow-app';

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.secret = this.config.get('jweSecret', { infer: true });
    this.expiresIn = this.config.get('jwtExpiresIn', { infer: true });
  }

  private getExpirationSeconds(expiresIn: string): number {
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) return parseInt(match[1], 10) * (units[match[2]] ?? 3600);
    return 86400;
  }

  private getKey() {
    if (!this.secret || this.secret.length < 32) {
      throw new Error('JWE_SECRET is missing or too short (minimum 32 characters)');
    }
    return createSecretKey(Buffer.from(this.secret));
  }

  async issueToken(payload: Record<string, unknown>): Promise<string> {
    const key = this.getKey();
    const expirationTime = this.getExpirationSeconds(this.expiresIn);

    return new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(Math.floor(Date.now() / 1000) + expirationTime)
      .encrypt(key);
  }

  async verifyToken(token: string): Promise<Record<string, unknown>> {
    const key = this.getKey();
    const { payload } = await jwtDecrypt(token, key, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return payload as Record<string, unknown>;
  }
}
