import {
  type Dj,
  type Guild,
  type Playlist,
  PrismaClient,
  type Role,
  type Setup,
  type Stay,
  type ChatHistory,
} from '@prisma/client'
import { env } from '#src/env'

export default class ServerData {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  getPrismaClient(): PrismaClient {
    return this.prisma
  }

  async get(guildId: string): Promise<Guild> {
    return (
      (await this.prisma.guild.findUnique({ where: { guildId } })) ??
      (await this.createGuild(guildId))
    )
  }

  async setPrefix(guildId: string, prefix: string): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      update: { prefix },
      create: { guildId, prefix },
    })
  }

  async getPrefix(guildId: string): Promise<string> {
    const guild = await this.get(guildId)
    return guild?.prefix ?? env.PREFIX
  }

  async updateLanguage(guildId: string, language: string): Promise<void> {
    await this.prisma.guild.update({
      where: { guildId },
      data: { language },
    })
  }

  async getLanguage(guildId: string): Promise<string> {
    const guild = await this.get(guildId)
    return guild?.language ?? env.DEFAULT_LANGUAGE
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
    await this.prisma.setup.delete({ where: { guildId } })
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

  async get_247(guildId?: string): Promise<Stay | Stay[] | null> {
    if (guildId) {
      //return await this.prisma.stay.findUnique({ where: { guildId } });
      const stay = await this.prisma.stay.findUnique({ where: { guildId } })
      if (stay) return stay
      return null
    }
    return this.prisma.stay.findMany()
  }

  async setDj(guildId: string, mode: boolean): Promise<void> {
    await this.prisma.dj.upsert({
      where: { guildId },
      update: { mode },
      create: { guildId, mode },
    })
  }

  async getDj(guildId: string): Promise<Dj | null> {
    return this.prisma.dj.findUnique({ where: { guildId } })
  }

  async getRoles(guildId: string): Promise<Role[]> {
    return this.prisma.role.findMany({ where: { guildId } })
  }

  async addRole(guildId: string, roleId: string): Promise<void> {
    await this.prisma.role.create({ data: { guildId, roleId } })
  }

  async removeRole(guildId: string, roleId: string): Promise<void> {
    await this.prisma.role.deleteMany({ where: { guildId, roleId } })
  }

  async clearRoles(guildId: string): Promise<void> {
    await this.prisma.role.deleteMany({ where: { guildId } })
  }

  async getPlaylist(userId: string, name: string): Promise<Playlist | null> {
    return this.prisma.playlist.findUnique({
      where: { userId_name: { userId, name } },
    })
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { userId },
    })
  }

  async createPlaylist(userId: string, name: string): Promise<void> {
    await this.prisma.playlist.create({ data: { userId, name } })
  }

  // createPlaylist with tracks
  async createPlaylistWithTracks(userId: string, name: string, tracks: string[]): Promise<void> {
    await this.prisma.playlist.create({
      data: {
        userId,
        name,
        tracks: JSON.stringify(tracks),
      },
    })
  }

  /**
   * Deletes a playlist from the database
   *
   * @param userId The ID of the user that owns the playlist
   * @param name The name of the playlist to delete
   */
  async deletePlaylist(userId: string, name: string): Promise<void> {
    await this.prisma.playlist.delete({
      where: { userId_name: { userId, name } },
    })
  }

  async deleteSongsFromPlaylist(userId: string, playlistName: string): Promise<void> {
    // Fetch the playlist
    const playlist = await this.getPlaylist(userId, playlistName)

    if (playlist) {
      // Update the playlist and reset the tracks to an empty array
      await this.prisma.playlist.update({
        where: {
          userId_name: {
            userId,
            name: playlistName,
          },
        },
        data: {
          tracks: JSON.stringify([]), // Set tracks to an empty array
        },
      })
    }
  }

  async addTracksToPlaylist(userId: string, playlistName: string, tracks: string[]) {
    // Serialize the tracks array into a JSON string
    const tracksJson = JSON.stringify(tracks)

    // Check if the playlist already exists for the user
    const playlist = await this.prisma.playlist.findUnique({
      where: {
        userId_name: {
          userId,
          name: playlistName,
        },
      },
    })

    if (playlist) {
      // If the playlist exists, handle existing tracks
      const existingTracks = playlist.tracks ? JSON.parse(playlist.tracks) : [] // Initialize as an empty array if null

      if (Array.isArray(existingTracks)) {
        // Merge new and existing tracks
        const updatedTracks = [...existingTracks, ...tracks]

        // Update the playlist with the new tracks
        await this.prisma.playlist.update({
          where: {
            userId_name: {
              userId,
              name: playlistName,
            },
          },
          data: {
            tracks: JSON.stringify(updatedTracks), // Store the updated tracks as a serialized JSON string
          },
        })
      } else {
        throw new Error('Existing tracks are not in an array format.')
      }
    } else {
      // If no playlist exists, create a new one with the provided tracks
      await this.prisma.playlist.create({
        data: {
          userId,
          name: playlistName,
          tracks: tracksJson, // Store the serialized JSON string
        },
      })
    }
  }

  async removeSong(userId: string, playlistName: string, encodedSong: string): Promise<void> {
    const playlist = await this.getPlaylist(userId, playlistName)
    if (playlist) {
      const tracks: string[] = JSON.parse(playlist?.tracks!)

      // Find the index of the song to remove
      const songIndex = tracks.indexOf(encodedSong)

      if (songIndex !== -1) {
        // Remove the song from the array
        tracks.splice(songIndex, 1)

        // Update the playlist with the new list of tracks
        await this.prisma.playlist.update({
          where: {
            userId_name: {
              userId,
              name: playlistName,
            },
          },
          data: {
            tracks: JSON.stringify(tracks), // Re-serialize the updated array back to a string
          },
        })
      }
    }
  }

  async getTracksFromPlaylist(userId: string, playlistName: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: {
        userId_name: {
          userId,
          name: playlistName,
        },
      },
    })

    if (!playlist) {
      return null
    }

    // Deserialize the tracks JSON string back into an array
    return JSON.parse(playlist.tracks!)
  }

  private async createGuild(guildId: string): Promise<Guild> {
    return this.prisma.guild.create({
      data: {
        guildId,
        prefix: env.PREFIX,
      },
    })
  }

  // Chat History methods
  async getChatHistory(channelId: string, limit: number = 20): Promise<ChatHistory | null> {
    return this.prisma.chatHistory.findFirst({
      where: { channelId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async updateChatHistory(
    channelId: string,
    userId: string,
    guildId: string,
    messages: any[],
    limit: number = 20
  ): Promise<void> {
    const existingHistory = await this.getChatHistory(channelId)

    if (existingHistory) {
      const existingMessages = existingHistory.messages as any[]
      const updatedMessages = [...existingMessages, ...messages].slice(-limit)

      await this.prisma.chatHistory.update({
        where: { id: existingHistory.id },
        data: { messages: updatedMessages },
      })
    } else {
      await this.prisma.chatHistory.create({
        data: {
          channelId,
          userId,
          guildId,
          messages,
        },
      })
    }
  }

  async clearChatHistory(channelId: string): Promise<void> {
    await this.prisma.chatHistory.deleteMany({ where: { channelId } })
  }

  async clearAllChatHistory(guildId: string): Promise<void> {
    await this.prisma.chatHistory.deleteMany({ where: { guildId } })
  }

  // AI Config methods
  async getAIConfig(guildId: string): Promise<any> {
    const config = await this.prisma.aIConfig.findUnique({ where: { guildId } })
    if (!config) {
      return this.createAIConfig(guildId)
    }
    return config
  }

  async createAIConfig(guildId: string): Promise<any> {
    return this.prisma.aIConfig.create({
      data: { guildId },
    })
  }

  async updateAIConfig(guildId: string, data: any): Promise<void> {
    await this.prisma.aIConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, ...data },
    })
  }

  async toggleAI(guildId: string): Promise<boolean> {
    const config = await this.getAIConfig(guildId)
    const newState = !config.enabled
    await this.updateAIConfig(guildId, { enabled: newState })
    return newState
  }

  async setAIPersonality(guildId: string, personality: string): Promise<void> {
    await this.updateAIConfig(guildId, { defaultPersonality: personality })
  }

  async updateAIStats(guildId: string, channelId: string, userId: string): Promise<void> {
    const config = await this.getAIConfig(guildId)
    const stats = config.stats || {
      totalMessages: 0,
      uniqueUsers: [],
      channelUsage: {},
      personalityUsage: {},
    }

    // Convert uniqueUsers array to Set for manipulation
    const uniqueUsersSet = new Set(stats.uniqueUsers || [])

    stats.totalMessages++
    uniqueUsersSet.add(userId)
    stats.channelUsage[channelId] = (stats.channelUsage[channelId] || 0) + 1

    await this.updateAIConfig(guildId, {
      stats: {
        ...stats,
        uniqueUsers: Array.from(uniqueUsersSet),
      },
    })
  }
}
