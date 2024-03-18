import { Model } from 'objection'
import Knex from 'knex'
import { SQLITE_CONFIG } from '#src/database/sqlite.config'

const knex = Knex(SQLITE_CONFIG)
Model.knex(knex)

export { knex, Model as ObjectionModel }

export const startObjection = async () => {
  try {
    await knex.raw('SELECT 1')
  } catch (error) {
    console.error(error)
  }
}
