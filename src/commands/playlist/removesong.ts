import type { AutocompleteInteraction } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class RemoveSong extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'removesong',
      description: {
        content: 'cmd.removesong.description',
        examples: ['removesong <playlist> <song>'],
        usage: 'removesong <playlist> <song>',
      },
      category: 'playlist',
      aliases: ['rs'],
      cooldown: 3,
      args: true,
      vote: true,
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
          name: 'playlist',
          description: 'cmd.removesong.options.playlist',
          type: 3,
          required: true,
          autocomplete: true,
        },
        {
          name: 'song',
          description: 'cmd.removesong.options.song',
          type: 3,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const playlist = args.shift()
    const song = args.join(' ')

    if (!playlist) {
      const errorMessage = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.provide_playlist'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [errorMessage] })
    }

    if (!song) {
      const errorMessage = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.provide_song'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [errorMessage] })
    }

    const playlistData = await client.db.getPlaylist(ctx.author?.id!, playlist)

    if (!playlistData) {
      const playlistNotFoundError = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.playlist_not_exist'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [playlistNotFoundError] })
    }

    const tracks = (await client.db.getTracksFromPlaylist(ctx.author?.id!, playlist)) || []

    if (!tracks.length) {
      const noSongsFoundError = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.song_not_found'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [noSongsFoundError] })
    }

    const nodes = client.manager.nodeManager.leastUsedNodes()
    const node = nodes[Math.floor(Math.random() * nodes.length)]

    if (!node) {
      const genericError = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.error_occurred'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [genericError] })
    }

    try {
      const decodedTracks = await node.decode.multipleTracks(tracks, ctx.author)
      const trackToRemove = decodedTracks.find(
        (track) =>
          track.info.title.toLowerCase().includes(song.toLowerCase()) ||
          track.info.author.toLowerCase().includes(song.toLowerCase())
      )

      if (!trackToRemove?.encoded) {
        const noSongsFoundError = this.client
          .embed()
          .setDescription(ctx.locale('cmd.removesong.messages.song_not_found'))
          .setColor(this.client.color.red)
        return await ctx.sendMessage({ embeds: [noSongsFoundError] })
      }

      await client.db.removeSong(ctx.author!.id, playlist, trackToRemove.encoded)

      const successMessage = this.client
        .embed()
        .setTitle(ctx.locale('cmd.removesong.messages.song_removed_title'))
        .setDescription(
          ctx.locale('cmd.removesong.messages.song_removed', {
            song: trackToRemove.info.title,
            playlist: playlistData.name,
          })
        )
        .setColor(this.client.color.green)
        .addFields({
          name: ctx.locale('cmd.removesong.messages.fields.match'),
          value: `${trackToRemove.info.title} · ${trackToRemove.info.author}`,
          inline: false,
        })

      await ctx.sendMessage({ embeds: [successMessage] })
    } catch (error) {
      client.logger.error(error)
      const genericError = this.client
        .embed()
        .setDescription(ctx.locale('cmd.removesong.messages.error_occurred'))
        .setColor(this.client.color.red)
      return await ctx.sendMessage({ embeds: [genericError] })
    }
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused()
    const userId = interaction.user.id

    const playlists = await this.client.db.getUserPlaylists(userId)

    const filtered = playlists.filter((playlist: { name: string }) =>
      playlist.name.toLowerCase().startsWith(focusedValue.toLowerCase())
    )

    await interaction.respond(
      filtered.map((playlist: { name: string }) => ({
        name: playlist.name,
        value: playlist.name,
      }))
    )
  }
}
