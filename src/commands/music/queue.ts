import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import type { Track } from 'lavalink-client'
import type { Requester } from '#src/types'

export default class Queue extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'queue',
      description: {
        content: 'cmd.queue.description',
        examples: ['queue'],
        usage: 'queue',
      },
      category: 'music',
      aliases: ['q'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    const currentTrack = player.queue.current

    if (!currentTrack) {
      return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    }

    const currentRequester = currentTrack.requester as Requester | undefined
    const currentSummary = ctx.locale('cmd.queue.now_playing', {
      title: currentTrack.info.title,
      uri: currentTrack.info.uri,
      requester: currentRequester?.id ?? ctx.author?.id ?? '',
      duration: currentTrack.info.isStream
        ? ctx.locale('cmd.queue.live')
        : client.utils.formatTime(currentTrack.info.duration),
    })

    if (player.queue.current && player.queue.tracks.length === 0) {
      return await ctx.sendMessage({
        embeds: [
          this.client
            .embed()
            .setColor(this.client.color.main)
            .setAuthor({
              name: ctx.locale('cmd.queue.title'),
              iconURL: ctx.guild.icon ? ctx.guild.iconURL()! : ctx.author?.displayAvatarURL(),
            })
            .setDescription(currentSummary)
            .addFields({
              name: ctx.locale('cmd.queue.sections.summary'),
              value: ctx.locale('cmd.queue.summary', {
                upcoming: 0,
                totalDuration: ctx.locale('cmd.queue.live'),
              }),
              inline: false,
            }),
        ],
      })
    }

    const songStrings: string[] = []
    let totalDurationMs = 0

    for (let i = 0; i < player.queue.tracks.length; i++) {
      const track = player.queue.tracks[i] as Track
      const requester = track.requester as Requester | undefined
      if (!track.info.isStream) {
        totalDurationMs += track.info.duration || 0
      }
      songStrings.push(
        ctx.locale('cmd.queue.track_info', {
          index: i + 1,
          title: track.info.title,
          uri: track.info.uri,
          requester: requester?.id ?? ctx.author?.id ?? '',
          duration: track.info.isStream
            ? ctx.locale('cmd.queue.live')
            : client.utils.formatTime(track.info.duration!),
        })
      )
    }

    let chunks = client.utils.chunk(songStrings, 8)

    if (chunks.length === 0) chunks = [songStrings]

    const pages = chunks.map((chunk: string[], index: number) => {
      return this.client
        .embed()
        .setColor(this.client.color.main)
        .setAuthor({
          name: ctx.locale('cmd.queue.title'),
          iconURL: ctx.guild.icon ? ctx.guild.iconURL()! : ctx.author?.displayAvatarURL(),
        })
        .setDescription(currentSummary)
        .addFields(
          {
            name: ctx.locale('cmd.queue.sections.summary'),
            value: ctx.locale('cmd.queue.summary', {
              upcoming: player.queue.tracks.length,
              totalDuration:
                totalDurationMs > 0
                  ? client.utils.formatTime(totalDurationMs)
                  : ctx.locale('cmd.queue.live'),
            }),
            inline: false,
          },
          {
            name: ctx.locale('cmd.queue.sections.up_next'),
            value: chunk.join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: ctx.locale('cmd.queue.page_info', {
            index: index + 1,
            total: chunks.length,
          }),
        })
    })
    return await client.utils.paginate(client, ctx, pages)
  }
}
