import type { AutocompleteInteraction, GuildMember } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { getMemberVoiceChannel } from '#common/player_runtime'

export default class LoadPlaylist extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'load',
      description: {
        content: 'cmd.load.description',
        examples: ['load <playlist>'],
        usage: 'load <playlist>',
      },
      category: 'playlist',
      aliases: ['lo'],
      cooldown: 3,
      args: true,
      vote: true,
      player: {
        voice: true,
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
          description: 'cmd.load.options.playlist',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    let player = client.manager.getPlayer(ctx.guild!.id)
    const playlistName = args.join(' ').trim()
    const playlistData = await client.db.getPlaylist(ctx.author?.id!, playlistName)
    if (!playlistData) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.load.messages.playlist_not_exist'),
            color: this.client.color.red,
          },
        ],
      })
    }

    const songs = (await client.db.getTracksFromPlaylist(ctx.author?.id!, playlistName)) as
      | string[]
      | null
    if (!songs || songs.length === 0) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.load.messages.playlist_empty'),
            color: client.color.red,
          },
        ],
      })
    }

    const memberVoiceChannel = getMemberVoiceChannel(ctx.member)
    if (!memberVoiceChannel) {
      return
    }

    if (!player) {
      player = client.manager.createPlayer({
        guildId: ctx.guild!.id,
        voiceChannelId: memberVoiceChannel.id,
        textChannelId: ctx.channel.id,
        selfMute: false,
        selfDeaf: true,
        vcRegion: memberVoiceChannel.rtcRegion!,
      })
      if (!player.connected) await player.connect()
    }

    const nodes = client.manager.nodeManager.leastUsedNodes()
    const node = nodes[Math.floor(Math.random() * nodes.length)]
    if (!node) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.load.messages.no_nodes'),
            color: client.color.red,
          },
        ],
      })
    }

    const tracks = await node.decode.multipleTracks(songs, ctx.author)
    if (tracks.length === 0) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.load.messages.playlist_empty'),
            color: client.color.red,
          },
        ],
      })
    }
    player.queue.add(tracks)
    const startsPlayback = !player.playing && player.queue.tracks.length > 0

    if (startsPlayback) await player.play({ paused: false })

    return await ctx.sendMessage({
      embeds: [
        this.client
          .embed()
          .setColor(this.client.color.main)
          .setTitle(ctx.locale('cmd.load.messages.playlist_loaded_title'))
          .setDescription(
            ctx.locale('cmd.load.messages.playlist_loaded', {
              name: playlistData.name,
              count: songs.length,
            })
          )
          .addFields(
            {
              name: ctx.locale('cmd.load.messages.fields.queue'),
              value: String(player.queue.tracks.length),
              inline: true,
            },
            {
              name: ctx.locale('cmd.load.messages.fields.voice'),
              value: `<#${memberVoiceChannel.id}>`,
              inline: true,
            },
            {
              name: ctx.locale('cmd.load.messages.fields.playback'),
              value: startsPlayback
                ? ctx.locale('cmd.load.messages.playback_started')
                : ctx.locale('cmd.load.messages.playback_queued'),
              inline: true,
            }
          )
          .setFooter({
            text: ctx.locale('cmd.load.messages.footer', {
              name: playlistData.name,
            }),
          }),
      ],
    })
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
