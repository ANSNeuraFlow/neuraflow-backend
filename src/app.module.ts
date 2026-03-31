import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

import configuration, { AppConfig, LoggerConfig, LoggerFormat } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClusterModule } from './modules/cluster/cluster.module';
import { EegStreamModule } from './modules/eeg-stream/eeg-stream.module';
import { HealthModule } from './modules/health/health.module';
import { MlModelsModule } from './modules/ml-models/ml-models.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TrainingJobsModule } from './modules/training-jobs/training-jobs.module';

@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const loggerConfig = config.get<LoggerConfig>('logger');

        return {
          pinoHttp: {
            level: loggerConfig.level,
            transport: loggerConfig.format === LoggerFormat.Pretty ? { target: 'pino-pretty' } : undefined,
            useLevelLabels: true,
            formatters: {
              level: (label: string) => {
                return { level: label };
              },
            },
            autoLogging: false,
          },
        };
      },
    }),
    DatabaseModule,

    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    AdminModule,
    ClusterModule,
    EegStreamModule,
    SessionsModule,
    MlModelsModule,
    TrainingJobsModule,
  ],
  providers: [Logger],
})
export class AppModule {}
