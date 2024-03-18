import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ObjectionModel } from '#src/lib/objection'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Dj extends ObjectionModel {
  static tableName = 'djs'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  guild_id: string
  mode: boolean
  created_at: string
  updated_at: string

  /**
   * ------------------------------------------------------
   * Relations
   * ------------------------------------------------------
   */
  static relationMappings = {
    guild: {
      relation: ObjectionModel.BelongsToOneRelation,
      modelClass: path.join(dirname, 'guild.model.js'),
      join: {
        from: 'djs.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
