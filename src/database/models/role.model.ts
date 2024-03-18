import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ObjectionModel } from '#src/lib/objection'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Role extends ObjectionModel {
  static tableName = 'roles'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  guild_id: string
  role_id: string
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
        from: 'roles.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
