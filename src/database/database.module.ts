import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { DatabaseHealthIndicator } from './database.health';
import { databaseProviders } from './database.provider';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [...databaseProviders, DatabaseHealthIndicator, DatabaseService],
  exports: [...databaseProviders, DatabaseHealthIndicator, DatabaseService],
})
export class DatabaseModule {}
