import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';

import { MlModelsService } from './ml-models.service';

@ApiTags('ML Models')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'models', version: '1' })
export class MlModelsController {
  constructor(private readonly mlModelsService: MlModelsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all trained models for the current user' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.mlModelsService.findAllForUser(req.user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get model details and download path' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.mlModelsService.findOne(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trained model' })
  remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.mlModelsService.delete(req.user.id, id);
  }
}
