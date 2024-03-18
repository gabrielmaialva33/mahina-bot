import { Model } from 'objection'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Setup extends Model {
  static tableName = 'setups'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  guild_id: string
  prefix: string
  text_id: string
  message_id: string
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
        from: 'setups.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
