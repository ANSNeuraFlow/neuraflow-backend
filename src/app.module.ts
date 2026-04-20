import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import configuration, { AppConfig, LoggerConfig, LoggerFormat } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { BridgeAuthModule } from './modules/bridge-auth/bridge-auth.module';
import { BridgeDeviceModule } from './modules/bridge-device/bridge-device.module';
import { ClusterModule } from './modules/cluster/cluster.module';
import { EegStreamModule } from './modules/eeg-stream/eeg-stream.module';
import { HealthModule } from './modules/health/health.module';
import { MlModelsModule } from './modules/ml-models/ml-models.module';
import { ModelDeploymentModule } from './modules/model-deployment/model-deployment.module';
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

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    AdminModule,
    ClusterModule,
    EegStreamModule,
    SessionsModule,
    MlModelsModule,
    TrainingJobsModule,
    ModelDeploymentModule,
    BridgeAuthModule,
    BridgeDeviceModule,
  ],
  providers: [Logger],
})
export class AppModule {}
