import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import type { AppConfig } from 'config/configuration';

import type { EegPayloadDto } from './dtos/eeg-payload.dto';

export interface EegKafkaMessage {
  userId: string;
  sessionId: string;
  timestamp: number;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
  ch5: number;
  ch6: number;
  ch7: number;
  ch8: number;
}

@Injectable()
export class EegStreamService implements OnModuleInit {
  private readonly eegTopic: string;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const kafka = this.config.get('kafka', { infer: true });
    this.eegTopic = kafka.eegTopic;
  }

  async onModuleInit(): Promise<void> {
    await this.kafkaClient.connect();
  }

  sendEegSample(userId: string, sessionId: string, payload: EegPayloadDto): void {
    const message: EegKafkaMessage = {
      userId,
      sessionId,
      ...payload,
    };

    this.kafkaClient.emit(this.eegTopic, {
      key: userId,
      value: JSON.stringify(message),
    });
  }
}
