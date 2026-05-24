import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { AppConfig } from 'config/configuration';
import { logLevel } from 'kafkajs';

import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { EegStreamService } from './eeg-stream.service';
import { EegDisplayGateway } from './gateway/eeg-display.gateway';
import { EegDisplayAuthGuard } from './gateway/eeg-display-auth.guard';
import { EegStreamGateway } from './gateway/eeg-stream.gateway';
import { EegWsAuthGuard } from './gateway/eeg-ws-auth.guard';

@Module({
  imports: [
    AuthModule,
    SessionsModule,
    // ---------- Konfiguracja i Połączenie z Apache Kafka --------------------
    // Rejestruje klienta Kafki (KAFKA_SERVICE) tworzącego stałe połączenie po protokole TCP.
    // Ustawienia (IP brokera) zaczytywane są asynchronicznie ze zmiennych środowiskowych.
    // ------------------------------------------------------------------------
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
                logLevel: process.env.NODE_ENV === 'production' ? logLevel.NOTHING : logLevel.WARN,
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
  providers: [EegStreamGateway, EegStreamService, EegWsAuthGuard, EegDisplayGateway, EegDisplayAuthGuard],
  exports: [EegStreamService],
})
export class EegStreamModule {}
