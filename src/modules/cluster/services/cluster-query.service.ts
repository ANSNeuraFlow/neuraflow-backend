import { Injectable } from '@nestjs/common';

import { CLUSTER_NODES } from '../constants/cluster-nodes.const';
import type { ClusterNodeModel } from '../models/cluster.model';
import { PrometheusService } from './prometheus.service';

@Injectable()
export class ClusterQueryService {
  constructor(private readonly prometheusService: PrometheusService) {}

  // ---------- Pobieranie Statusu Węzłów -----------------------------------
  // Funkcja pobiera i mapuje dane z Prometheusa określające stan wszystkich węzłów.
  // ------------------------------------------------------------------------
  async getNodes(): Promise<ClusterNodeModel[]> {
    const [cpuResults, memUsedResults, memTotalResults, diskUsedResults, diskTotalResults, upResults] =
      await Promise.all([
        // Zapytanie obliczające procentowe użycie procesora (skonwertowany rate idle mode)
        this.prometheusService.query('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'),
        // Zapytanie pobierające ilość zajętej pamięci RAM (Total - Available)
        this.prometheusService.query('node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes'),
        // Zapytanie pobierające całkowitą, dostępną wielkość pamięci RAM
        this.prometheusService.query('node_memory_MemTotal_bytes'),
        // Zapytanie sprawdzające ilość użytej przestrzeni dyskowej na głównej partycji
        this.prometheusService.query(
          'node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs",fstype!="rootfs"} - node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs",fstype!="rootfs"}',
        ),
        // Zapytanie pobierające całkowity rozmiar przestrzeni dyskowej na partycji głównej
        this.prometheusService.query('node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs",fstype!="rootfs"}'),
        // Zapytanie monitorujące, czy endpoint eksportera działa (1 = online, 0 = offline)
        this.prometheusService.query('up{job="prometheus"}'),
      ]);

    return CLUSTER_NODES.map((node) => {
      const cpuPercent = this.prometheusService.extractValueForNode(cpuResults, node.address);
      const memUsed = this.prometheusService.extractValueForNode(memUsedResults, node.address);
      const memTotal = this.prometheusService.extractValueForNode(memTotalResults, node.address);
      const diskUsed = this.prometheusService.extractValueForNode(diskUsedResults, node.address);
      const diskTotal = this.prometheusService.extractValueForNode(diskTotalResults, node.address);
      const upValue = this.prometheusService.extractValueForNode(upResults, node.address);

      const isOnline = upValue === 1 || (upValue === null && cpuPercent !== null);

      return {
        id: node.id,
        address: node.address,
        role: node.role,
        isOnline,
        cpu: {
          usagePercent: cpuPercent !== null ? parseFloat(cpuPercent.toFixed(2)) : null,
        },
        memory: {
          usedBytes: memUsed,
          totalBytes: memTotal,
          usedPercent:
            memUsed !== null && memTotal !== null && memTotal > 0
              ? parseFloat(((memUsed / memTotal) * 100).toFixed(2))
              : null,
        },
        disk: {
          usedBytes: diskUsed,
          totalBytes: diskTotal,
          usedPercent:
            diskUsed !== null && diskTotal !== null && diskTotal > 0
              ? parseFloat(((diskUsed / diskTotal) * 100).toFixed(2))
              : null,
        },
      };
    });
  }
}
