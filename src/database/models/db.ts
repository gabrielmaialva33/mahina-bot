import { Dj } from '#src/database/models/dj.model'
import { BotChannels } from '#src/database/models/bot_channels.model'
import { Guild } from '#src/database/models/guild.model'
import { Playlist } from '#src/database/models/playlist.model'
import { Premium } from '#src/database/models/premium.model'
import { Role } from '#src/database/models/role.model'
import { Setup } from '#src/database/models/setup.model'
import { Stay } from '#src/database/models/stays.model'

export class DB {
  botChannels: typeof BotChannels
  dj: typeof Dj
  guild: typeof Guild
  playlist: typeof Playlist
  premium: typeof Premium
  role: typeof Role
  setup: typeof Setup
  stay: typeof Stay

  constructor() {
    this.botChannels = BotChannels
    this.dj = Dj
    this.guild = Guild
    this.playlist = Playlist
    this.premium = Premium
    this.role = Role
    this.setup = Setup
    this.stay = Stay
  }

  /**
   * ------------------------------------------------------
   * Guild Methods
   * ------------------------------------------------------
   */
  async get(guildId: string): Promise<Guild> {
    const data = await this.guild.query().findOne({ guild_id: guildId })
    if (!data) return this.guild.query().insertAndFetch({ guild_id: guildId })
    else return data
  }

  async getPrefix(guildId: string): Promise<Guild> {
    const data = await this.guild.query().findOne({ guild_id: guildId })
    if (!data) return this.guild.query().insert({ guild_id: guildId })
    else return data
  }

  /**
   * ------------------------------------------------------
   * Stay Methods
   * ------------------------------------------------------
   */
  //     public get_247(guildId?: string): any {
  //         if (guildId) {
  //             const data: any = db.prepare('SELECT * FROM stay WHERE guildId = ?').get(guildId);
  //             if (!data) {
  //                 db.prepare('INSERT INTO stay (guildId) VALUES (?)').run(guildId);
  //                 return false;
  //             } else {
  //                 return data;
  //             }
  //         } else {
  //             const data: any = db.prepare('SELECT * FROM stay').all();
  //             if (!data) {
  //                 return false;
  //             } else {
  //                 return data;
  //             }
  //         }
  //     }
  async get_247(guildId?: string): Promise<Stay[]> {
    if (guildId) {
      const data = await this.stay.query().findOne({ guild_id: guildId })
      if (!data) {
        await this.stay.query().insert({ guild_id: guildId })
        return this.get_247(guildId)
      } else {
        return [data]
      }
    } else {
      const data = await this.stay.query().select()
      if (!data) {
        return this.get_247()
      } else {
        return data
      }
    }
  }

  async set_247(guildId: string, textId: string, voiceId: string): Promise<void> {
    let data = await this.stay.query().findOne({ guild_id: guildId })
    if (!data) {
      await this.stay.query().insert({ guild_id: guildId, text_id: textId, voice_id: voiceId })
    } else {
      await this.stay
        .query()
        .update({ text_id: textId, voice_id: voiceId })
        .where({ guild_id: guildId })
    }
  }

  async delete_247(guildId: string): Promise<void> {
    await this.stay.query().delete().where({ guild_id: guildId })
  }

  /**
   * ------------------------------------------------------
   * Setup Methods
   * ------------------------------------------------------
   */
  async getSetup(guildId: string): Promise<Setup> {
    const data = await this.setup.query().findOne({ guild_id: guildId })
    if (!data) {
      return this.setup.query().insertAndFetch({ guild_id: guildId })
    } else {
      return data
    }
  }

  async setSetup(guildId: string, textId: string, messageId: string): Promise<void> {
    let data = await this.setup.query().findOne({ guild_id: guildId })
    if (!data) {
      await this.setup.query().insert({ guild_id: guildId, text_id: textId, message_id: messageId })
    } else {
      await this.setup
        .query()
        .update({ text_id: textId, message_id: messageId })
        .where({ guild_id: guildId })
    }
  }

  async deleteSetup(guildId: string): Promise<void> {
    await this.setup.query().delete().where({ guild_id: guildId })
  }

  /**
   * ------------------------------------------------------
   * DJ Methods
   * ------------------------------------------------------
   */
  async getDj(guildId: string): Promise<Dj> {
    const data = await this.dj.query().findOne({ guild_id: guildId })
    if (!data) {
      // @ts-ignore
      return this.dj.query().insertAndFetch({ guild_id: guildId, mode: 0 })
    } else {
      await this.dj.query().update({ mode: false }).where({ guild_id: guildId })
      return data
    }
  }

  /**
   * ------------------------------------------------------
   * Roles Methods
   * ------------------------------------------------------
   */
  async getRoles(guildId: string): Promise<Role[]> {
    const data = await this.role.query().where({ guild_id: guildId })
    if (!data) {
      await this.role.query().insert({ guild_id: guildId }).returning('*')
      return this.getRoles(guildId)
    } else {
      return data
    }
  }

  async addRole(guildId: string, roleId: string): Promise<void> {
    const data = await this.role.query().findOne({ guild_id: guildId, role_id: roleId })
    if (!data) await this.role.query().insert({ guild_id: guildId, role_id: roleId })
  }

  async removeRole(guildId: string, roleId: string): Promise<void> {
    const data = await this.role.query().findOne({ guild_id: guildId, role_id: roleId })
    if (data) await this.role.query().delete().where({ guild_id: guildId, role_id: roleId })
  }

  async clearRoles(guildId: string): Promise<void> {
    await this.role.query().delete().where({ guild_id: guildId })
  }

  /**
   * ------------------------------------------------------
   * BotChannel Methods
   * ------------------------------------------------------
   */
  async getBotChannel(guildId: string): Promise<any> {
    const data = await this.botChannels.query().findOne({ guild_id: guildId })
    if (!data) {
      await this.botChannels.query().insert({ guild_id: guildId })
      return false
    } else {
      return data
    }
  }

  async setBotChannel(guildId: string, textId: string): Promise<void> {
    let data = await this.botChannels.query().findOne({ guild_id: guildId })
    if (!data) {
      await this.botChannels.query().insert({ guild_id: guildId, text_id: textId })
    } else {
      await this.botChannels.query().update({ text_id: textId }).where({ guild_id: guildId })
    }
  }

  /**
   * ------------------------------------------------------
   * Playlist Methods
   * ------------------------------------------------------
   */
  async getPlaylist(userId: string, name: string): Promise<any> {
    const data = await this.playlist.query().findOne({ user_id: userId, name: name })
    if (!data) {
      return false
    } else {
      return data
    }
  }

  async createPlaylist(userId: string, name: string): Promise<void> {
    const data = await this.playlist.query().findOne({ user_id: userId, name: name })
    if (!data) {
      await this.playlist.query().insert({ user_id: userId, name: name })
    } else {
      throw new Error('Playlist already exists')
    }
  }

  async deletePlaylist(userId: string, name: string): Promise<void> {
    const data = await this.playlist.query().findOne({ user_id: userId, name: name })
    if (data) {
      await this.playlist.query().delete().where({ user_id: userId, name: name })
    } else {
      throw new Error('Playlist does not exist')
    }
  }

  async addSong(userId: string, name: string, song: string): Promise<void> {
    const data = await this.playlist.query().findOne({ user_id: userId, name: name })
    if (data) {
      const existingSongs = JSON.parse(data.songs || '[]')
      const updatedSongs = existingSongs.concat(song)
      await this.playlist
        .query()
        .update({ songs: JSON.stringify(updatedSongs) })
        .where({ user_id: userId, name: name })
    } else {
      throw new Error('Playlist does not exist')
    }
  }

  async removeSong(userId: string, name: string, song: string): Promise<void> {
    const data = await this.playlist.query().findOne({ user_id: userId, name: name })
    if (data) {
      await this.playlist
        .query()
        // @ts-ignore
        .update({ songs: JSON.stringify(data.songs.filter((s: string) => s !== song)) })
        .where({ user_id: userId, name: name })
    } else {
      throw new Error('Playlist does not exist')
    }
  }
}
