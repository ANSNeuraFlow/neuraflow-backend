import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';

import { BridgeAuthService } from './bridge-auth.service';
import { BridgeAuthStartDto, BridgeAuthTokenDto } from './dtos';

@ApiTags('Bridge Auth')
@Controller({ path: 'bridge/auth', version: '1' })
export class BridgeAuthController {
  constructor(private readonly service: BridgeAuthService) {}

  @UseGuards(AuthGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start bridge OAuth-like flow — issue one-time code' })
  startAuthFlow(@Req() req: AuthenticatedRequest, @Body() dto: BridgeAuthStartDto) {
    return this.service.startAuthFlow(req.user.id, dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange one-time code for bridge access token' })
  exchangeToken(@Body() dto: BridgeAuthTokenDto) {
    return this.service.exchangeCodeForToken(dto);
  }
}
