import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { AppConfig, DatabaseConfig } from '../config/configuration';
import { KYSELY_CONNECTION_KEY } from './constants';
import type { DB } from './schema/db';

export const databaseProviders: Provider[] = [
  {
    provide: KYSELY_CONNECTION_KEY,
    inject: [ConfigService],
    useFactory: (appConfig: ConfigService<AppConfig, true>) => {
      const database = appConfig.get<DatabaseConfig>('database');

      // creates a Kysely connection
      const db = new Kysely<DB>({
        dialect: new PostgresDialect({
          pool: new Pool({
            connectionString: database.url,
            max: database.poolSize,
          }),
        }),
        plugins: [new CamelCasePlugin()],
      });

      return db;
    },
  },
];
