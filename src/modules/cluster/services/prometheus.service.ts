import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from 'config/configuration';
import { firstValueFrom } from 'rxjs';

import type { PrometheusQueryResponse, PrometheusScalarResult } from '../models/prometheus.model';

const NODE_EXPORTER_PORT = 9100;

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {
    const prometheusConfig = this.configService.get<AppConfig['prometheus']>('prometheus');
    this.baseUrl = prometheusConfig.url;
    this.timeoutMs = prometheusConfig.timeoutMs;
  }

  async query(promql: string): Promise<PrometheusScalarResult[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PrometheusQueryResponse>(`${this.baseUrl}/api/v1/query`, {
          params: { query: promql },
          timeout: this.timeoutMs,
        }),
      );

      const data: PrometheusQueryResponse = response.data;

      if (data.status !== 'success') {
        this.logger.warn(`Prometheus query failed: ${promql}`);
        return [];
      }

      return data.data.result;
    } catch (error) {
      this.logger.error(`Prometheus unreachable: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Prometheus is unreachable');
    }
  }

  extractValueForNode(results: PrometheusScalarResult[], nodeAddress: string): number | null {
    const instancePattern = `${nodeAddress}:${NODE_EXPORTER_PORT}`;
    const match = results.find((r) => r.metric['instance'] === instancePattern);
    if (!match) return null;
    const val = parseFloat(match.value[1]);
    return isNaN(val) ? null : val;
  }
}
