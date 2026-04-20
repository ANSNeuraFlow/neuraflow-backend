import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type BridgeAuthenticatedRequest, BridgeAuthGuard } from 'modules/bridge-auth/bridge-auth.guard';

import { BridgeDeviceService } from './bridge-device.service';
import { RegisterDeviceDto } from './dtos';

@ApiTags('Bridge Device')
@ApiBearerAuth()
@UseGuards(BridgeAuthGuard)
@Controller({ path: 'bridge/devices', version: '1' })
export class BridgeDeviceController {
  constructor(private readonly service: BridgeDeviceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new bridge device' })
  async register(@Req() req: BridgeAuthenticatedRequest, @Body() dto: RegisterDeviceDto, @Ip() ip: string) {
    const device = await this.service.registerDevice(req.bridge.userId, req.bridge.tokenId, dto, ip);
    return { deviceId: device.id };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all bridge devices for the current user' })
  list(@Req() req: BridgeAuthenticatedRequest) {
    return this.service.listUserDevices(req.bridge.userId);
  }
}
