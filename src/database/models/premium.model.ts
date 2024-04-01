import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ObjectionModel } from '#src/lib/objection'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Premium extends ObjectionModel {
  static tableName = 'premiums'
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
        from: 'premiums.guild_id',
        to: 'guilds.id',
      },
    },
  }
  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  user_id: string
  guild_id: string
  created_at: string
  updated_at: string
}
