import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

import { DatabaseHealthIndicator } from '../../database/database.health';

@Controller('health')
@ApiTags('Health Check')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Health check for K8s or other monitoring tools',
  })
  healthCheck(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy()]);
  }
}
