import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';
import { ModelDeploymentService } from 'modules/model-deployment/model-deployment.service';

import { CreateDeploymentDto } from './dtos/create-deployment.dto';

@ApiTags('Model Deployments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'model-deployments', version: '1' })
export class ModelDeploymentController {
  constructor(private readonly modelDeploymentService: ModelDeploymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Deploy a model to Ray Serve cluster' })
  deploy(@Req() req: AuthenticatedRequest, @Body() dto: CreateDeploymentDto) {
    return this.modelDeploymentService.deploy(req.user.id, dto.modelId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a running deployment' })
  stop(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.modelDeploymentService.stop(req.user.id, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all deployments for current user' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.modelDeploymentService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get deployment details' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.modelDeploymentService.findOne(req.user.id, id);
  }
}
