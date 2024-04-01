import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ObjectionModel } from '#src/lib/objection'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Stay extends ObjectionModel {
  static tableName = 'stays'
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
        from: 'stays.guild_id',
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
  guild_id: string
  text_id: string
  voice_id: string
  created_at: string
  updated_at: string

  /**
   * ------------------------------------------------------
   * Hooks
   * ------------------------------------------------------
   */

  /**
   * ------------------------------------------------------
   * Scopes
   * ------------------------------------------------------
   */
}
