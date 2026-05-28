import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';
import type { BridgeAuthenticatedRequest } from 'modules/bridge-auth/bridge-auth.guard';
import { BridgeAuthGuard } from 'modules/bridge-auth/bridge-auth.guard';

import {
  VideoStreamActiveResponseDto,
  VideoStreamRegisterResponseDto,
  VideoStreamStatusResponseDto,
  VideoStreamWatchCredentialsResponseDto,
} from './dtos/video-stream.dto';
import { VideoStreamService } from './video-stream.service';

@ApiTags('Video Stream')
@Controller({ path: 'video-stream', version: '1' })
export class VideoStreamController {
  constructor(private readonly videoStreamService: VideoStreamService) {}

  @UseGuards(BridgeAuthGuard)
  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register drone video stream for the authenticated bridge' })
  register(@Req() req: BridgeAuthenticatedRequest): Promise<VideoStreamRegisterResponseDto> {
    return this.videoStreamService.registerStream(req.bridge.tokenId, req.bridge.userId);
  }

  @UseGuards(BridgeAuthGuard)
  @Get('status/:streamKey')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video stream status for bridge relay' })
  getStatusForBridge(
    @Req() req: BridgeAuthenticatedRequest,
    @Param('streamKey') streamKey: string,
  ): Promise<VideoStreamStatusResponseDto> {
    return this.videoStreamService.getStatusForBridge(streamKey, req.bridge.tokenId);
  }

  @UseGuards(AuthGuard)
  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active video stream for the current user' })
  getActive(@Req() req: AuthenticatedRequest): Promise<VideoStreamActiveResponseDto> {
    return this.videoStreamService.getActiveForUser(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('watch-credentials')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get short-lived WebSocket credentials for video playback' })
  getWatchCredentials(@Req() req: AuthenticatedRequest): Promise<VideoStreamWatchCredentialsResponseDto> {
    return this.videoStreamService.getWatchCredentials(req.user.id);
  }
}
