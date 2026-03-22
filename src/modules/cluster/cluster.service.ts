import { Injectable } from '@nestjs/common';

import type { ClusterNodeModel, ClusterOverviewModel, ClusterSummaryModel } from './models/cluster.model';
import { ClusterQueryService } from './services/cluster-query.service';

@Injectable()
export class ClusterService {
  constructor(private readonly clusterQueryService: ClusterQueryService) {}

  async getClusterOverview(): Promise<ClusterOverviewModel> {
    const nodes = await this.clusterQueryService.getNodes();
    const summary = this.buildSummary(nodes);

    return {
      nodes,
      summary,
      fetchedAt: new Date().toISOString(),
    };
  }

  private buildSummary(nodes: ClusterNodeModel[]): ClusterSummaryModel {
    const onlineNodes = nodes.filter((n) => n.isOnline);

    const cpuValues = onlineNodes.map((n) => n.cpu.usagePercent).filter((v): v is number => v !== null);

    const clusterCpuPercent =
      cpuValues.length > 0 ? parseFloat((cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2)) : null;

    const totalMemUsed = this.sumOrNull(nodes.map((n) => n.memory.usedBytes));
    const totalMemTotal = this.sumOrNull(nodes.map((n) => n.memory.totalBytes));
    const totalDiskUsed = this.sumOrNull(nodes.map((n) => n.disk.usedBytes));
    const totalDiskTotal = this.sumOrNull(nodes.map((n) => n.disk.totalBytes));

    return {
      totalNodes: nodes.length,
      onlineNodes: onlineNodes.length,
      offlineNodes: nodes.length - onlineNodes.length,
      cpu: { usagePercent: clusterCpuPercent },
      memory: {
        usedBytes: totalMemUsed,
        totalBytes: totalMemTotal,
        usedPercent:
          totalMemUsed !== null && totalMemTotal !== null && totalMemTotal > 0
            ? parseFloat(((totalMemUsed / totalMemTotal) * 100).toFixed(2))
            : null,
      },
      disk: {
        usedBytes: totalDiskUsed,
        totalBytes: totalDiskTotal,
        usedPercent:
          totalDiskUsed !== null && totalDiskTotal !== null && totalDiskTotal > 0
            ? parseFloat(((totalDiskUsed / totalDiskTotal) * 100).toFixed(2))
            : null,
      },
    };
  }

  private sumOrNull(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null;
  }
}
