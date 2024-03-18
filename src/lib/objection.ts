import { Model } from 'objection'
import Knex from 'knex'
import { SQLITE_CONFIG } from '#src/database/sqlite.config'

const knex = Knex(SQLITE_CONFIG)
Model.knex(knex)

export const startObjection = async () => {
  try {
    // check if the database connection is working
    await knex.raw('SELECT 1')
  } catch (error) {
    console.error(error)
  }
}
