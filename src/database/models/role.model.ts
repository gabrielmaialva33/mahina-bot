import { Model } from 'objection'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Role extends Model {
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
      relation: Model.BelongsToOneRelation,
      modelClass: path.join(dirname, 'guild.model.js'),
      join: {
        from: 'roles.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
