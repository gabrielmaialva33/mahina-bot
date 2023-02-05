import { Knex } from 'knex'

import { EnvConfig } from '@/config/env.config'

export const DatabaseConfig: Knex.Config<Knex.Sqlite3ConnectionConfig> = {
  client: 'better-sqlite3',
  useNullAsDefault: true,
  connection: { filename: EnvConfig.DATABASE_PATH },
  migrations: {
    tableName: 'knex_migrations',
    directory: process.cwd() + '/src/database/migrations',
  },
  seeds: {
    directory: process.cwd() + '/src/database/seeds',
  },
}
