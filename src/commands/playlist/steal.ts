import type { AutocompleteInteraction, User } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class StealPlaylist extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'steal',
      description: {
        content: 'cmd.steal.description',
        examples: ['steal <@user> <playlist_name>'],
        usage: 'steal <@user> <playlist_name>',
      },
      category: 'playlist',
      aliases: ['st'],
      cooldown: 3,
      args: true,
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
          description: 'cmd.steal.options.user',
          type: 6,
          required: true,
        },
        {
          name: 'playlist',
          description: 'cmd.steal.options.playlist',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    let targetUser = ctx.args[0]
    const playlistName = ctx.args[1]
    let targetUserId: string | null = null
    let resolvedUser: User | undefined

    if (targetUser?.startsWith('<@') && targetUser.endsWith('>')) {
      targetUser = targetUser.slice(2, -1)
      if (targetUser.startsWith('!')) {
        targetUser = targetUser.slice(1)
      }
      resolvedUser = await client.users.fetch(targetUser)
      targetUserId = resolvedUser.id
    } else if (targetUser) {
      try {
        resolvedUser = await client.users.fetch(targetUser)
        targetUserId = resolvedUser.id
      } catch (_error) {
        const users = client.users.cache.filter(
          (user) => user.username.toLowerCase() === targetUser.toLowerCase()
        )

        if (users.size > 0) {
          resolvedUser = users.first()
          targetUserId = resolvedUser?.id || null
        } else {
          return await ctx.sendMessage({
            embeds: [
              {
                description: ctx.locale('cmd.steal.messages.invalid_user'),
                color: this.client.color.red,
              },
            ],
          })
        }
      }
    }

    if (!playlistName) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.steal.messages.provide_playlist'),
            color: this.client.color.red,
          },
        ],
      })
    }

    if (!targetUserId) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.steal.messages.provide_user'),
            color: this.client.color.red,
          },
        ],
      })
    }

    try {
      const targetPlaylist = await client.db.getPlaylist(targetUserId, playlistName)

      if (!targetPlaylist) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: ctx.locale('cmd.steal.messages.playlist_not_exist'),
              color: this.client.color.red,
            },
          ],
        })
      }

      const targetSongs = await client.db.getTracksFromPlaylist(targetUserId, playlistName)

      const existingPlaylist = await client.db.getPlaylist(ctx.author?.id!, playlistName)
      if (existingPlaylist) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: ctx.locale('cmd.steal.messages.playlist_exists', {
                playlist: playlistName,
              }),
              color: this.client.color.red,
            },
          ],
        })
      }

      await client.db.createPlaylistWithTracks(ctx.author?.id!, playlistName, targetSongs)

      return await ctx.sendMessage({
        embeds: [
          this.client
            .embed()
            .setColor(this.client.color.main)
            .setTitle(ctx.locale('cmd.steal.messages.playlist_stolen_title'))
            .setDescription(
              ctx.locale('cmd.steal.messages.playlist_stolen', {
                playlist: playlistName,
                user: resolvedUser?.username || ctx.locale('cmd.steal.messages.unknown_user'),
              })
            )
            .addFields({
              name: ctx.locale('cmd.steal.messages.fields.tracks'),
              value: String(targetSongs.length),
              inline: true,
            }),
        ],
      })
    } catch (error) {
      client.logger.error(error)
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.steal.messages.error_occurred'),
            color: this.client.color.red,
          },
        ],
      })
    }
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    try {
      const focusedValue = interaction.options.getFocused()
      const userOptionId = interaction.options.get('user')?.value as string

      if (!userOptionId) {
        await interaction
          .respond([
            {
              name: this.client.utils.cutText(
                interaction.locale === 'pt-BR'
                  ? 'Escolhe um usuário antes de buscar a playlist.'
                  : 'Choose a user before searching playlists.',
                100
              ),
              value: 'NoUser',
            },
          ])
          .catch(console.error)
        return
      }

      const user = await interaction.client.users.fetch(userOptionId)
      if (!user) {
        await interaction
          .respond([
            {
              name: interaction.locale === 'pt-BR' ? 'Usuário não encontrado.' : 'User not found.',
              value: 'NoUserFound',
            },
          ])
          .catch(console.error)
        return
      }

      const playlists = await this.client.db.getUserPlaylists(user.id)

      if (!playlists || playlists.length === 0) {
        await interaction
          .respond([
            {
              name:
                interaction.locale === 'pt-BR'
                  ? 'Esse usuário não tem playlists.'
                  : 'No playlists found for this user.',
              value: 'NoPlaylists',
            },
          ])
          .catch(console.error)
        return
      }

      const filtered = playlists.filter((playlist: { name: string }) =>
        playlist.name.toLowerCase().startsWith(focusedValue.toLowerCase())
      )

      return await interaction
        .respond(
          filtered.map((playlist: { name: any }) => ({ name: playlist.name, value: playlist.name }))
        )
        .catch(console.error)
    } catch (error) {
      return await interaction
        .respond([
          {
            name:
              interaction.locale === 'pt-BR'
                ? 'Falha ao buscar playlists.'
                : 'An error occurred while fetching playlists.',
            value: 'Error',
          },
        ])
        .catch(console.error)
    }
  }
}
