import { Model } from 'objection'
import Knex from 'knex'

import { Logger } from '@/libs/pino/logger.pino'
import { DatabaseConfig } from '@/config/database.config'

const KnexORM = Knex(DatabaseConfig)

Model.knex(KnexORM)

KnexORM.on('query', (query) => {
  Logger.debug(`Method: ${query.method}`)
  Logger.debug(`Query: ${query.sql}`)
  Logger.debug(`Bindings: ${query.bindings}`)
})

export { KnexORM }
