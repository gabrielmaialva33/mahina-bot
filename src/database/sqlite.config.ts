import { Knex } from 'knex'
import process from 'node:process'
import { env } from '#src/env'

import { KnexLogger } from '#utils/knex.utils'

export const SQLITE_CONFIG: Knex.Config<Knex.Sqlite3ConnectionConfig> = {
  client: 'better-sqlite3',
  connection: process.cwd() + '/database.sqlite',
  debug: env.DB_DEBUG,
  log: KnexLogger,
  useNullAsDefault: true,
  migrations: {
    tableName: 'knex_migrations',
    directory: 'src/database/migrations',
  },
  seeds: {
    directory: 'src/database/seeds',
  },
}
