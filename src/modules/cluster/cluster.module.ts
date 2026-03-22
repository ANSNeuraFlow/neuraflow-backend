import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ClusterController } from './cluster.controller';
import { ClusterService } from './cluster.service';
import { ClusterGateway } from './gateway/cluster.gateway';
import { WsAuthGuard } from './gateway/ws-auth.guard';
import { ClusterQueryService } from './services/cluster-query.service';
import { PrometheusService } from './services/prometheus.service';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [ClusterController],
  providers: [ClusterService, ClusterQueryService, PrometheusService, ClusterGateway, WsAuthGuard],
})
export class ClusterModule {}
