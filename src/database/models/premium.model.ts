import { Model } from 'objection'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Premium extends Model {
  static tableName = 'premiums'

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
        from: 'premiums.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
