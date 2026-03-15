import { CamelCasePlugin } from 'kysely';
import { defineConfig, getKnexTimestampPrefix } from 'kysely-ctl';
import { Pool } from 'pg';

const DATABASE_FOLDER = process.env.NODE_ENV === 'production' ? './dist/src/database' : './src/database';

export default defineConfig({
  dialect: 'pg',
  dialectConfig: {
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  },
  migrations: {
    migrationFolder: `${DATABASE_FOLDER}/migrations`,
    allowJS: true,
    getMigrationPrefix: getKnexTimestampPrefix,
  },
  seeds: {
    allowJS: true,
    getSeedPrefix: getKnexTimestampPrefix,
    seedFolder: `${DATABASE_FOLDER}/seeds`,
  },
  // TODO(deps): Consider opening a PR to https://github.com/wavezync/nestjs-starter to add this option
  plugins: [new CamelCasePlugin()],
});
