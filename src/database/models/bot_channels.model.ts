import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ObjectionModel } from '#src/lib/objection'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class BotChannels extends ObjectionModel {
  static tableName = 'bot_channels'

  /**
   * ------------------------------------------------------
   * Columns
   * ------------------------------------------------------
   */
  id: number
  guild_id: string
  text_id: string
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
        from: 'bot_channels.guild_id',
        to: 'guilds.id',
      },
    },
  }
}
