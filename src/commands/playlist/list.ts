import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import type { User } from 'discord.js'
import type { Playlist } from '@prisma/client'

export default class GetPlaylists extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'list',
      description: {
        content: 'cmd.list.description',
        examples: ['list', 'list @user'],
        usage: 'list [@user]',
      },
      category: 'playlist',
      aliases: ['lst'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'user',
          description: 'cmd.list.options.user',
          type: 6,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    try {
      const resolvedTarget = await this.resolveTargetUser(client, ctx)

      if (!resolvedTarget) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: ctx.locale('cmd.list.messages.invalid_username'),
              color: this.client.color.red,
            },
          ],
        })
      }

      const { userId, user } = resolvedTarget

      if (!userId) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: ctx.locale('cmd.list.messages.invalid_userid'),
              color: this.client.color.red,
            },
          ],
        })
      }

      const playlists = await client.db.getUserPlaylists(userId)

      if (!playlists || playlists.length === 0) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: ctx.locale('cmd.list.messages.no_playlists'),
              color: this.client.color.red,
            },
          ],
        })
      }

      const playlistEntries = playlists.map((playlist) => ({
        ...playlist,
        trackCount: parseTrackCount(playlist),
      }))
      const chunks = client.utils.chunk(playlistEntries, 8)
      const targetUsername = user?.username || ctx.locale('cmd.list.messages.your')

      const pages = chunks.map((chunk, index) =>
        this.client
          .embed()
          .setColor(this.client.color.main)
          .setTitle(ctx.locale('cmd.list.messages.playlists_title', { username: targetUsername }))
          .setDescription(
            ctx.locale('cmd.list.messages.summary', {
              count: playlists.length,
            })
          )
          .addFields({
            name: ctx.locale('cmd.list.messages.section'),
            value: chunk
              .map((playlist, itemIndex) =>
                ctx.locale('cmd.list.messages.item', {
                  index: index * 8 + itemIndex + 1,
                  name: playlist.name,
                  count: playlist.trackCount,
                })
              )
              .join('\n'),
            inline: false,
          })
          .setFooter({
            text: ctx.locale('cmd.list.messages.page_info', {
              index: index + 1,
              total: chunks.length,
            }),
          })
      )

      await client.utils.paginate(client, ctx, pages)
    } catch (error) {
      client.logger.error(error)
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.list.messages.error'),
            color: this.client.color.red,
          },
        ],
      })
    }
  }

  private async resolveTargetUser(
    client: MahinaBot,
    ctx: Context
  ): Promise<{ userId: string | undefined; user: User | undefined } | null> {
    let targetUser = ctx.args[0]

    if (!targetUser) {
      return {
        userId: ctx.author?.id,
        user: ctx.author,
      }
    }

    if (targetUser.startsWith('<@') && targetUser.endsWith('>')) {
      targetUser = targetUser.slice(2, -1)

      if (targetUser.startsWith('!')) {
        targetUser = targetUser.slice(1)
      }
    }

    try {
      const user = await client.users.fetch(targetUser)
      return { userId: user.id, user }
    } catch {
      const user = client.users.cache.find(
        (cachedUser) => cachedUser.username.toLowerCase() === targetUser.toLowerCase()
      )

      if (!user) {
        return null
      }

      return { userId: user.id, user }
    }
  }
}

function parseTrackCount(playlist: Playlist): number {
  if (!playlist.tracks) {
    return 0
  }

  try {
    const tracks = JSON.parse(playlist.tracks) as unknown
    return Array.isArray(tracks) ? tracks.length : 0
  } catch {
    return 0
  }
}
