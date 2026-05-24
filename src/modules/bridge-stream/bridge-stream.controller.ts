import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';

import { BridgeStreamService } from './bridge-stream.service';
import { BridgeControlCommandDto } from './dtos/bridge-control-command.dto';
import { BridgeMarkerDto } from './dtos/bridge-marker.dto';
import { BridgeSessionDto } from './dtos/bridge-session.dto';

@ApiTags('Bridge')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'bridge/control', version: '1' })
export class BridgeStreamController {
  constructor(private readonly bridgeStreamService: BridgeStreamService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get bridge connection status for the current user' })
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.bridgeStreamService.getBridgeStatus(req.user.id);
  }

  @Post('command')
  @ApiOperation({ summary: 'Send streaming command to connected desktop bridge' })
  sendCommand(@Req() req: AuthenticatedRequest, @Body() dto: BridgeControlCommandDto) {
    const sent = this.bridgeStreamService.sendStreamingCommand(req.user.id, dto.action);
    return { ok: true, sent };
  }

  @Post('marker')
  @ApiOperation({ summary: 'Relay a BCI marker to the desktop bridge' })
  sendMarker(@Req() req: AuthenticatedRequest, @Body() dto: BridgeMarkerDto) {
    const sent = this.bridgeStreamService.sendMarkerCommand(req.user.id, dto.marker);
    return { ok: true, sent };
  }

  @Post('session')
  @ApiOperation({ summary: 'Bind active EEG session for bridge uplink to Kafka' })
  async setBridgeSession(@Req() req: AuthenticatedRequest, @Body() dto: BridgeSessionDto) {
    await this.bridgeStreamService.setActiveSession(req.user.id, dto.sessionId);
    return { ok: true };
  }
}
