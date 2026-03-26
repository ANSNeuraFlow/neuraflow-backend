import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { AppConfig } from 'config/configuration';
import { logLevel } from 'kafkajs';

import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { EegStreamService } from './eeg-stream.service';
import { EegStreamGateway } from './gateway/eeg-stream.gateway';
import { EegWsAuthGuard } from './gateway/eeg-ws-auth.guard';

@Module({
  imports: [
    AuthModule,
    SessionsModule,
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService<AppConfig, true>) => {
          const kafkaConfig = config.get('kafka', { infer: true });

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'neuraflow-eeg-producer',
                brokers: kafkaConfig.brokers,
                logLevel: logLevel.NOTHING,
              },
              producer: {
                allowAutoTopicCreation: false,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [EegStreamGateway, EegStreamService, EegWsAuthGuard],
})
export class EegStreamModule {}
