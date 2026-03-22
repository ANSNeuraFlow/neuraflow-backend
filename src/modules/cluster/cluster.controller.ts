import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'common/decorators/roles.decorator';
import { RolesGuard } from 'common/guards/roles.guard';

import { AuthGuard } from '../auth/auth.guard';
import { ClusterService } from './cluster.service';
import { ClusterOverviewResponseDto } from './dtos';

@ApiTags('Cluster')
@ApiBearerAuth()
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@Controller({
  path: 'cluster',
  version: '1',
})
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get full cluster overview (admin only)',
    description:
      'Returns real-time metrics for each cluster node and aggregate summary. Data is fetched live from Prometheus.',
  })
  @ApiResponse({ status: 200, type: ClusterOverviewResponseDto })
  async getClusterOverview(): Promise<ClusterOverviewResponseDto> {
    return this.clusterService.getClusterOverview();
  }
}
