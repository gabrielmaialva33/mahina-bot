import {
  type Botchannel,
  type Dj,
  type Guild,
  type Playlist,
  PrismaClient,
  type Role,
  type Setup,
  type Song,
  type Stay,
} from '@prisma/client'
import { env } from '#src/env'

export default class ServerData {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async get(guildId: string): Promise<Guild> {
    return (
      (await this.prisma.guild.findUnique({
        where: { guildId },
      })) ?? (await this.createGuild(guildId))
    )
  }

  private async createGuild(guildId: string): Promise<Guild> {
    return this.prisma.guild.create({
      data: { guildId, prefix: env.DISC_BOT_PREFIX },
    })
  }

  async getPrefix(guildId: string): Promise<Guild> {
    const p = await this.prisma.guild.findUnique({ where: { guildId } })
    if (!p) {
      await this.createGuild(guildId)
      return this.getPrefix(guildId)
    }
    return p
  }

  async setPrefix(guildId: string, prefix: string): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      update: { prefix },
      create: { guildId, prefix },
    })
  }

  async set_247(guildId: string, textId: string, voiceId: string): Promise<void> {
    await this.prisma.stay.upsert({
      where: { guildId },
      update: { textId, voiceId },
      create: { guildId, textId, voiceId },
    })
  }

  async delete_247(guildId: string): Promise<void> {
    await this.prisma.stay.delete({ where: { guildId } })
  }

  async setDj(guildId: string, mode: boolean): Promise<void> {
    await this.prisma.dj.upsert({
      where: { guildId },
      update: { mode },
      create: { guildId, mode },
    })
  }

  async get_247(guildId?: string): Promise<Stay | Stay[] | null> {
    if (guildId) {
      return this.prisma.stay.findUnique({ where: { guildId } })
    }
    return this.prisma.stay.findMany()
  }

  async getDj(guildId: string): Promise<Dj | null> {
    return this.prisma.dj.findUnique({
      where: { guildId },
    })
  }

  async getRoles(guildId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { guildId },
    })
  }

  async addRole(guildId: string, roleId: string): Promise<void> {
    await this.prisma.role.create({
      data: { guildId, roleId },
    })
  }

  async removeRole(guildId: string, roleId: string): Promise<void> {
    await this.prisma.role.deleteMany({
      where: { guildId, roleId },
    })
  }

  async clearRoles(guildId: string): Promise<void> {
    await this.prisma.role.deleteMany({
      where: { guildId },
    })
  }

  async getBotChannel(guildId: string): Promise<Botchannel | null> {
    return this.prisma.botchannel.findUnique({
      where: { guildId },
    })
  }

  async setBotChannel(guildId: string, textId: string): Promise<void> {
    await this.prisma.botchannel.upsert({
      where: { guildId },
      update: { textId },
      create: { guildId, textId },
    })
  }

  async getSetup(guildId: string): Promise<Setup | null> {
    return this.prisma.setup.findUnique({ where: { guildId } })
  }

  async setSetup(guildId: string, textId: string, messageId: string): Promise<void> {
    await this.prisma.setup.upsert({
      where: { guildId },
      update: { textId, messageId },
      create: { guildId, textId, messageId },
    })
  }

  async deleteSetup(guildId: string): Promise<void> {
    await this.prisma.setup.delete({
      where: { guildId },
    })
  }

  async getPlaylist(userId: string, name: string): Promise<Playlist | null> {
    return this.prisma.playlist.findUnique({
      where: { userId_name: { userId, name } },
    })
  }

  async createPlaylist(userId: string, name: string): Promise<void> {
    await this.prisma.playlist.create({
      data: { userId, name },
    })
  }

  async deletePlaylist(userId: string, name: string): Promise<void> {
    await this.prisma.playlist.delete({
      where: { userId_name: { userId, name } },
    })
  }

  async addSong(userId: string, name: string, song: string): Promise<void> {
    const playlist = await this.getPlaylist(userId, name)
    if (playlist) {
      await this.prisma.song.create({
        // @ts-ignore
        data: {
          track: JSON.stringify(song),
          playlistId: playlist.id,
        },
      })
    } else {
      await this.createPlaylist(userId, name)
      await this.addSong(userId, name, song)
    }
  }

  async removeSong(userId: string, name: string, song: string): Promise<void> {
    const playlist = await this.getPlaylist(userId, name)
    if (playlist) {
      await this.prisma.song.delete({
        where: {
          track_playlistId: { track: song, playlistId: playlist.id },
        },
      })
    }
  }

  async getSongs(userId: string, name: string): Promise<Song[]> {
    const playlist = await this.getPlaylist(userId, name)
    if (playlist) {
      return this.prisma.song.findMany({
        where: { playlistId: playlist.id },
      })
    }
    return []
  }

  async clearPlaylist(userId: string, name: string): Promise<void> {
    const playlist = await this.getPlaylist(userId, name)
    if (playlist) {
      await this.prisma.song.deleteMany({ where: { playlistId: playlist.id } })
    }
  }

  async clearPlaylists(userId: string): Promise<void> {
    await this.prisma.playlist.deleteMany({ where: { userId } })
  }

  async clearAllPlaylists(): Promise<void> {
    await this.prisma.playlist.deleteMany()
  }

  async clearAllSongs(): Promise<void> {
    await this.prisma.song.deleteMany()
  }
}
